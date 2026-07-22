import ReactECharts from "echarts-for-react";
import * as echarts from "echarts";
import { useTheme } from "next-themes";

export default function EChartsPreview({
  options,
}: {
  options: Record<string, unknown>;
}) {
  const { resolvedTheme } = useTheme();

  return (
    <ReactECharts
      echarts={echarts}
      option={{
        ...options,
        animation: false,
        backgroundColor: options.backgroundColor ?? "transparent",
        toolbox: {
          show: true,
          feature: {
            saveAsImage: { title: "Save as image" },
          },
        },
      }}
      theme={resolvedTheme === "dark" ? "dark" : undefined}
      notMerge
      style={{ height: 280, width: "100%" }}
    />
  );
}
