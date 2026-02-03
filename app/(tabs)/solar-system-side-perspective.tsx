import GenericView from "@/components/ui/generic-view";
import SolarSystemSidePerspective from "@/components/solar-system-side-perspective";

export default function SolarSystemSidePerspectiveView() {
  return (
    <GenericView>
      <SolarSystemSidePerspective isActive={true} />
    </GenericView>
  );
}
