import { RateAnalysisScreen } from "../../../../../components/rate-analysis/RateAnalysisScreen";

export const metadata = {
  title: "Rate Analysis | BOQ Engine Pro",
  description: "Calculate tender rates and detailed resource breakup",
};

export default function RateAnalysisPage({ params }: { params: { id: string } }) {
  return <RateAnalysisScreen projectId={params.id} />;
}
