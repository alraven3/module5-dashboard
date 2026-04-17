import { useRef, useMemo } from "react";
import * as d3 from "d3";
import { useDimensions} from "./use-dimensions";
import { data } from "../energy";
// Responsive component = wrapper that manages the dimensions and does nothing else
export const ResponsiveBarplot = ({props}) => { 
  const chartRef = useRef(null);

  const chartSize = useDimensions(chartRef);

  return (
    // it's necessary to add "overflow: 'hidden'" because it stops the SVG from inflating the container and avoids feedback loops based on the che container's children, which was my issue at first
    <div ref={chartRef} style={{ width: '100%', height: '100%', overflow: 'hidden'  }}> 
      <Barplot
        height={chartSize.height}
        width={chartSize.width}
        data={data}
        {...props} // pass all the props
      />
    </div>
  );
};

const MARGIN = { top: 30, right: 30, bottom: 30, left: 50 };
const BAR_PADDING = 0.3;

// Non responsive component
const Barplot = ({ width, height, data }) => {
  const boundsWidth = width - MARGIN.right - MARGIN.left;
  const boundsHeight = height - MARGIN.top - MARGIN.bottom;
  const filteredData = useMemo(() => {
    return data.filter((d) => d.year  == 2024 && d.country!="World") // filtering: selecting 2024 only and excluding the "World" category
        .sort((a, b) => b.primary_energy - a.primary_energy) // sorting from highest to lowest in terms of primary_energy value
        .slice(0, 5); // keeping only the top 5
  }, [data]);
  const groups = useMemo(() => { // categories for y axis
    return filteredData.map((d) => d.country);
  }, [filteredData]);
  const yScale = useMemo(() => {
    return d3
      .scaleBand()
      .domain(groups)
      .range([0, boundsHeight])
      .padding(BAR_PADDING);
  }, [groups, boundsHeight]);
  const xScale = useMemo(() => {
    const max = d3.max(filteredData.map((d) => d.primary_energy));
    return d3
      .scaleLinear()
      .domain([0, max || 10])
      .range([0, boundsWidth]);
  }, [filteredData, boundsWidth]);
  const allShapes = filteredData.map((d, i) => {
    const y = yScale(d.country);
    if (y === undefined) {
      return null;
    }

    return (
      <g key={i}>
        <rect
          x={xScale(0)}
          y={yScale(d.country)}
          width={xScale(d.primary_energy)}
          height={yScale.bandwidth()}
          opacity={0.7}
          stroke="#9d174d"
          fill="#9d174d"
          fillOpacity={0.3}
          strokeWidth={1}
          rx={1}
        />
        <text
          x={xScale(0) + 5}
          y={y + yScale.bandwidth() / 1.8}
          textAnchor="start"
          alignmentBaseline="central"
          fontSize={12}
        >
          {d.country}
        </text>
      </g>
    );
  });

  const grid = xScale
    .ticks(boundsWidth < 350 ? 2 : 4) // conditionally sets the number of x-axis ticks
    .slice(1)
    .map((value, i) => (
      <g key={i}>
        <line
          x1={xScale(value)}
          x2={xScale(value)}
          y1={0}
          y2={boundsHeight}
          stroke="#808080"
          opacity={0.2}
        />
        <text
          x={xScale(value)}
          y={boundsHeight + 10}
          textAnchor="middle"
          alignmentBaseline="central"
          fontSize={10}
          fill="#808080"
        >
          {value}
        </text>
      </g>
    ));
return (
    <svg width={width} height={height}>
        <text
            x={width / 2}
            y={MARGIN.top / 2}
            textAnchor="middle"
            fontSize={14}
            fontWeight="bold"
        >
            Top 5 Countries by Total Energy Consumption (2024)
        </text>
        <g
        width={boundsWidth}
        height={boundsHeight}
        transform={`translate(${[MARGIN.left, MARGIN.top].join(",")})`}
        >
        {grid}
        {allShapes}
        </g>
    </svg>
    );

}