import { View, StyleSheet, Dimensions, Text } from "react-native";
import type {
  BoardConfig,
  PieceSymbol,
  Color,
  Row,
  Column,
} from "js-chess-engine";

import { move, moves, ai, status, Game } from "js-chess-engine";
import { useEffect, useMemo, useState } from "react";
import Animated, {
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { scheduleOnRN } from "react-native-worklets";

enum SquareColor {
  BLACK = "squareBlack",
  WHITE = "squareWhite",
}

type Point = {
  x: number;
  y: number;
};

type PieceProperties = {
  coord: Point;
  position: Position;
  piece: PieceSymbol;
};

type SquareProperties = {
  id: Position;
  styleClassName: SquareColor;
  row: Row;
  column: Column;
  coords: Point;
};

type Position = `${Column}${Row}`;
type CoordKey = `${Point["x"]}:${Point["y"]}`;

type PiecesPropertiesMap = Partial<Record<Position, PieceProperties>>;

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const BOARD_SIZE = SCREEN_WIDTH * 0.9;
const SQUARE_SIZE = BOARD_SIZE / 8;
const PIECE_SIZE = SQUARE_SIZE * 0.9;
const SQUARE_MIDDLE = SQUARE_SIZE / 2;
const PIECE_OFFSET = SQUARE_MIDDLE - PIECE_SIZE / 2;
const COLUMNS: Column[] = ["A", "B", "C", "D", "E", "F", "G", "H"];

function initializeBoardConfig(): BoardConfig {
  return new Game().exportJson();
}

function alignPieceToSquare(pieceCoord: Point): Point {
  "worklet";
  function align(value: number): number {
    return SQUARE_SIZE * Math.floor(value / SQUARE_SIZE);
  }
  return {
    x: align(pieceCoord.x),
    y: align(pieceCoord.y),
  };
}

function getCoordKey(coord: Point): CoordKey {
  "worklet";
  return `${coord.x}:${coord.y}`;
}

function isPieceWhite(letter: string): boolean {
  "worklet";
  return letter.toUpperCase() === letter;
}

function checkIfPointIsWithinBoard(point: Point): boolean {
  "worklet";
  return !(
    point.x < 0 ||
    point.x > BOARD_SIZE ||
    point.y < 0 ||
    point.y > BOARD_SIZE
  );
}

const BOARD: readonly SquareProperties[] = Array.from({ length: 8 * 8 }).map(
  (_, index) => {
    const { row, column } = getSquareCoordinates(index);
    return {
      id: `${column}${row}` as Position,
      styleClassName: getSquareColor(index),
      row,
      column,
      coords: getSquarePoint(index),
    };
  }
);

const coordsToPositionsMap = new Map<CoordKey, Position>(
  BOARD.map((square) => [getCoordKey(square.coords), square.id])
);

const positionsToCoordsMap = new Map<Position, CoordKey>(
  BOARD.map((square) => [square.id, getCoordKey(square.coords)])
);

function transformCoordKeyToPoint(coordKey: CoordKey): Point {
  const [x, y] = coordKey.split(":");
  return { x: Number(x), y: Number(y) };
}

function getSquareColor(index: number): SquareColor {
  if (Math.floor(index / 8) % 2 === 0) {
    return index % 2 === 0 ? SquareColor.BLACK : SquareColor.WHITE;
  }
  return index % 2 === 0 ? SquareColor.WHITE : SquareColor.BLACK;
}

function getSquareCoordinates(index: number): { row: Row; column: Column } {
  const revertedRow = Math.floor(index / 8);
  const row = String(8 - revertedRow) as Row;
  const column = COLUMNS[index % 8];
  return { row, column };
}

function getSquarePoint(index: number): Point {
  const x = Math.floor(index % 8) * SQUARE_SIZE;
  const y = Math.floor(index / 8) * SQUARE_SIZE;
  return { x, y };
}

function calculatePiecesProperties(
  boardConfig: BoardConfig
): PiecesPropertiesMap {
  return Object.entries(boardConfig.pieces).reduce<PiecesPropertiesMap>(
    (acc, [position, piece]) => {
      const typedPosition = position as Position;
      const squareCoordsKey = positionsToCoordsMap.get(typedPosition);
      if (!squareCoordsKey) {
        throw new Error(
          `Square coords not found for position: ${typedPosition}`
        );
      }
      const pieceCoords = transformCoordKeyToPoint(squareCoordsKey);
      acc[typedPosition] = {
        coord: alignPieceToSquare(pieceCoords),
        position: typedPosition,
        piece,
      };
      return acc;
    },
    {} as PiecesPropertiesMap
  );
}

function getPieceColor(piece: PieceSymbol): Color {
  "worklet";
  return isPieceWhite(piece) ? "white" : "black";
}

function drawPlayerColor(): Color {
  "worklet";
  const randomColor = Math.random() > 0.5 ? "white" : "black";
  return randomColor as Color;
}

export default function ChessBoard() {
  const [boardConfig, setBoardConfig] = useState<BoardConfig>(() =>
    initializeBoardConfig()
  );

  const playerColor = useMemo(() => drawPlayerColor(), []);

  const piecesProperties = useMemo<PiecesPropertiesMap>(
    () => calculatePiecesProperties(boardConfig),
    [boardConfig]
  );

  const legalMoves = useMemo(() => moves(boardConfig), [boardConfig]);

  const currentTurnColor = useMemo(
    () => status(boardConfig).turn,
    [boardConfig]
  );

  const isPlayerTurn = useMemo(
    () => currentTurnColor === playerColor,
    [currentTurnColor, playerColor]
  );

  const startPieceCoords = useSharedValue<Point | null>(null);
  const activePieceOffsetX = useSharedValue<number>(0);
  const activePieceOffsetY = useSharedValue<number>(0);
  const activePiecePosition = useSharedValue<Position | null>(null);
  const activePiecePiece = useSharedValue<PieceSymbol | null>(null);

  function resetGestureState() {
    "worklet";
    startPieceCoords.value = null;
    activePieceOffsetX.value = 0;
    activePieceOffsetY.value = 0;
    activePiecePosition.value = null;
    activePiecePiece.value = null;
  }

  function handlePlayerGameMove(
    from: Position,
    to: Position,
    customBoardConfig?: BoardConfig
  ) {
    const newBoardConfig = move(customBoardConfig ?? boardConfig, from, to);
    setBoardConfig(newBoardConfig);
  }

  useEffect(() => {
    resetGestureState();
  }, [boardConfig]);

  useEffect(() => {
    if (isPlayerTurn) {
      return;
    }
    const { board: newBoardConfig, move } = ai(boardConfig, { play: false });
    const [from] = Object.keys(move) as [Position];
    const to = move[from] as Position;
    const fromSquareCoordsKey = positionsToCoordsMap.get(from);
    const toSquareCoordsKey = positionsToCoordsMap.get(to);
    if (!fromSquareCoordsKey || !toSquareCoordsKey) {
      return;
    }
    const fromSquareCoords = transformCoordKeyToPoint(fromSquareCoordsKey);
    const toSquareCoords = transformCoordKeyToPoint(toSquareCoordsKey);
    if (!fromSquareCoords || !toSquareCoords) {
      return;
    }
    activePiecePosition.value = from;

    activePieceOffsetX.value = withTiming(
      toSquareCoords.x - fromSquareCoords.x,
      { duration: 1000 }
    );
    activePieceOffsetY.value = withTiming(
      toSquareCoords.y - fromSquareCoords.y,
      { duration: 1000 },
      () => {
        scheduleOnRN(handlePlayerGameMove, from, to, newBoardConfig);
      }
    );
  }, [
    isPlayerTurn,
    boardConfig,
    piecesProperties,
    activePieceOffsetX,
    activePieceOffsetY,
    activePiecePosition,
  ]);

  const panGesture = Gesture.Pan()
    .activateAfterLongPress(400)
    .onStart((e) => {
      if (!isPlayerTurn) {
        return;
      }
      const alignedCoords = alignPieceToSquare({ x: e.x, y: e.y });
      const position = coordsToPositionsMap.get(getCoordKey(alignedCoords));
      if (!position) {
        return;
      }
      const activePiece = piecesProperties[position];
      if (!activePiece) {
        return;
      }
      const pieceColor = getPieceColor(activePiece.piece);
      if (pieceColor !== currentTurnColor) {
        return;
      }
      startPieceCoords.value = activePiece.coord;
      activePieceOffsetX.value = activePiece.coord.x;
      activePieceOffsetY.value = activePiece.coord.y;
      activePiecePosition.value = activePiece.position;
      activePiecePiece.value = activePiece.piece;
    })
    .onUpdate((e) => {
      if (!startPieceCoords.value || !activePiecePosition.value) {
        return;
      }
      activePieceOffsetX.value = e.translationX;
      activePieceOffsetY.value = e.translationY;
    })
    .onEnd(() => {
      if (!startPieceCoords.value || !activePiecePosition.value) {
        resetGestureState();
        return;
      }
      const piecePositionX =
        startPieceCoords.value.x + activePieceOffsetX.value;
      const piecePositionY =
        startPieceCoords.value.y + activePieceOffsetY.value;
      const pieceIsWithinBoard = checkIfPointIsWithinBoard({
        x: piecePositionX,
        y: piecePositionY,
      });

      if (!pieceIsWithinBoard) {
        resetGestureState();
        return;
      }
      const squareCoords = alignPieceToSquare({
        x: piecePositionX + SQUARE_MIDDLE,
        y: piecePositionY + SQUARE_MIDDLE,
      });
      const targetPosition = coordsToPositionsMap.get(
        getCoordKey(squareCoords)
      );
      const pieceLegalMoves = legalMoves[activePiecePosition.value];

      const isMoveLegal =
        !!targetPosition && pieceLegalMoves?.includes(targetPosition);
      if (!isMoveLegal) {
        resetGestureState();
        return;
      }
      activePieceOffsetX.value = squareCoords.x - startPieceCoords.value.x;
      activePieceOffsetY.value = squareCoords.y - startPieceCoords.value.y;

      scheduleOnRN(
        handlePlayerGameMove,
        activePiecePosition.value,
        targetPosition
      );
    });

  return (
    <View style={styles.container}>
      <Text style={styles.playerColor}>Current player: {playerColor}</Text>
      <Text style={styles.playerColor}>
        {isPlayerTurn ? "Your turn" : "Opponent's turn"}
      </Text>
      <GestureDetector gesture={panGesture}>
        <View style={styles.board}>
          {BOARD.map((square) => (
            <View
              key={square.id}
              style={[styles.square, styles[square.styleClassName]]}
            />
          ))}
          {Object.values(piecesProperties).map((pieceProperties) => (
            <PieceItem
              key={pieceProperties.position}
              pieceProperties={pieceProperties}
              activePieceOffsetX={activePieceOffsetX}
              activePieceOffsetY={activePieceOffsetY}
              activePiecePosition={activePiecePosition}
            />
          ))}
        </View>
      </GestureDetector>
    </View>
  );
}

function PieceItem({
  pieceProperties,
  activePieceOffsetX,
  activePieceOffsetY,
  activePiecePosition,
}: {
  pieceProperties: PieceProperties;
  activePieceOffsetX: SharedValue<number>;
  activePieceOffsetY: SharedValue<number>;
  activePiecePosition: SharedValue<Position | null>;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const isActive = activePiecePosition.value === pieceProperties.position;
    return {
      transform: [
        {
          translateX: withSpring(
            pieceProperties.coord.x +
              (isActive ? activePieceOffsetX.value : 0) +
              PIECE_OFFSET
          ),
        },
        {
          translateY: withSpring(
            pieceProperties.coord.y +
              (isActive ? activePieceOffsetY.value : 0) +
              PIECE_OFFSET
          ),
        },
        {
          scale: withSpring(isActive ? 1.2 : 1),
        },
      ],
    };
  });
  return (
    <Animated.View
      style={[
        styles.piece,
        isPieceWhite(pieceProperties.piece)
          ? styles.pieceWhite
          : styles.pieceBlack,
        animatedStyle,
      ]}
    >
      <Text
        style={[
          styles.pieceText,
          isPieceWhite(pieceProperties.piece)
            ? styles.pieceTextWhite
            : styles.pieceTextBlack,
        ]}
      >
        {pieceProperties.piece}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    height: "100%",
    backgroundColor: "skyblue",
    justifyContent: "center",
    alignItems: "center",
  },
  board: {
    width: BOARD_SIZE,
    height: BOARD_SIZE,
    backgroundColor: "#333333",
    position: "relative",
    flexDirection: "row",
    flexWrap: "wrap",
  },
  square: {
    width: SQUARE_SIZE,
    height: SQUARE_SIZE,
  },
  [SquareColor.BLACK]: {
    backgroundColor: "#111111",
  },
  [SquareColor.WHITE]: {
    backgroundColor: "#f1f1f1",
  },
  squareText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#f1cd0f",
  },
  piece: {
    width: PIECE_SIZE,
    height: PIECE_SIZE,
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
    top: 0,
    left: 0,
    zIndex: 2,
    shadowColor: "black",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    borderRadius: PIECE_SIZE,
  },
  pieceWhite: {
    backgroundColor: "#f3f3f3",
    color: "black",
    borderWidth: 1,
    borderColor: "#333333",
  },
  pieceBlack: {
    backgroundColor: "#333333",
    color: "white",
    borderWidth: 1,
    borderColor: "#f3f3f3",
  },
  pieceText: {
    fontSize: 18,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  pieceTextWhite: {
    color: "#333333",
  },
  pieceTextBlack: {
    color: "#f3f3f3",
  },
  playerColor: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
  },
});
