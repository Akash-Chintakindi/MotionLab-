import type { StepComponentProps } from "./types";
import { ConceptStep } from "./ConceptStep";
import { MultipleChoiceStep } from "./MultipleChoiceStep";
import { GraphDragStep } from "./GraphDragStep";
import { SortStep } from "./SortStep";
import { NumericStep } from "./NumericStep";
import { SliderSimulationStep } from "./SliderSimulationStep";

export function StepRenderer(props: StepComponentProps) {
  switch (props.step.type) {
    case "concept":
      return <ConceptStep {...props} />;
    case "multipleChoice":
      return <MultipleChoiceStep {...props} />;
    case "graphDrag":
      return <GraphDragStep {...props} />;
    case "sort":
      return <SortStep {...props} />;
    case "numeric":
      return <NumericStep {...props} />;
    case "sliderSimulation":
      return <SliderSimulationStep {...props} />;
    default:
      return null;
  }
}
