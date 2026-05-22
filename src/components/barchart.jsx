import { useRef, useMemo } from "react";
import * as d3 from "d3";
import { useDimensions } from "./use-dimensions";
import { data } from "../energy";

// Responsive component = wrapper that manages the dimensions and does nothing else
export const ResponsiveBarplot = ({ title, ...props }) => {
  const chartRef = useRef(null);
  const chartSize = useDimensions(chartRef);

  return (
    <div
      ref={chartRef}
      style={{
        width: "100%",
        height: "100%",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {title && (
        <h3
          style={{
            margin: "0 0 10px 0",
            fontSize: "1rem",
            fontWeight: "bold",
            textAlign: "center",
            color: "#333",
            flexShrink: 0,
          }}
        >
          {title}
        </h3>
      )}
      <div
        style={{
          flex: 1,
          position: "relative",
          width: "100%",
          height: "100%",
          overflow: "hidden",
        }}
      >
        <Barplot
          height={chartSize.height - (title ? 40 : 0)} // Ajustement hauteur titre
          width={chartSize.width}
          data={data}
          {...props}
        />
      </div>
    </div>
  );
};

const MARGIN = { top: 10, right: 30, bottom: 30, left: 50 };
const BAR_PADDING = 0.3;

// Non responsive component
const Barplot = ({ width, height, data }) => {
  const boundsWidth = width - MARGIN.right - MARGIN.left;
  const boundsHeight = height - MARGIN.top - MARGIN.bottom;

  const filteredData = useMemo(() => {
    return data
      .filter((d) => d.year == 2024 && d.country != "World")
      .sort((a, b) => b.primary_energy - a.primary_energy)
      .slice(0, 5);
  }, [data]);

  const groups = useMemo(() => {
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

  const allShapes = filteredData.map((d) => {
    const y = yScale(d.country);
    if (y === undefined) return null;

    return (
      <g key={d.country} className="barchart-row">
        <rect
          x={xScale(0)}
          y={y}
          width={xScale(d.primary_energy)}
          height={yScale.bandwidth()}
          fill="#ef90b3"
          className="bar"
        />
        <text
          x={xScale(0) + 5}
          y={y + yScale.bandwidth() / 2}
          textAnchor="start"
          alignmentBaseline="middle"
          fontSize={13}
          fill="#333"
          style={{ pointerEvents: "none" }}
        >
          {d.country}
        </text>
      </g>
    );
  });

  const grid = xScale
    .ticks(boundsWidth < 350 ? 2 : 4)
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
          y={boundsHeight + 15}
          textAnchor="middle"
          alignmentBaseline="hanging"
          fontSize={11}
          fill="#808080"
        >
          {value}
        </text>
      </g>
    ));

  return (
    <svg width={width} height={height}>
      {/* 
         CLÉ DU SUCCÈS : 
         On applique la classe "container" sur le groupe qui contient 
         UNIQUEMENT les éléments interactifs (grille + barres).
         Ainsi, le "vide" autour des marges ne déclenche pas le hover.
      */}
      <g
        className="container"
        transform={`translate(${MARGIN.left},${MARGIN.top})`}
      >
        {grid}
        {allShapes}
      </g>
    </svg>
  );
};