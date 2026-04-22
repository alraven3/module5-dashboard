import { useRef, useMemo } from "react";
import * as d3 from "d3";
import { useDimensions } from "./use-dimensions";
import { data } from "../energy";

export const ResponsiveLineChart = ({ style, title, subtitle, ...props }) => {
  const chartRef = useRef(null);
  const chartSize = useDimensions(chartRef);
  return (
    // <div ref={chartRef} style={{ width: '100%', height: '100%', overflow: 'hidden', ...style }}><h2></h2>
    //   <LineChart
    //     height={chartSize.height}
    //     width={chartSize.width}
    //     data={data}
    //     {...props}
    //   />
    // </div>
    <div ref={chartRef} style={{ 
      width: '100%', 
      height: '100%', 
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column' // Important : empile le titre et le graphe
    }}> 
    {title && (
        <h3 style={{ 
          margin: '0 0 0 0', 
          fontSize: '1rem', 
          fontWeight: 'bold', 
          textAlign: 'center',
          color: '#333',
          flexShrink: 0 // Empêche le titre de s'écraser
        }}>
          {title}
        </h3>
      )}
    {subtitle && (
        <h3 style={{ 
          margin: '0 0 0 0', 
          fontSize: '1rem', 
          fontWeight: 'normal', 
          textAlign: 'center',
          color: '#333',
          flexShrink: 0 // Empêche le titre de s'écraser
        }}>
          {subtitle}
        </h3>
      )}
    <div ref={chartRef} style={{ flex: 1, position: 'relative', width: '100%', height: '100%', overflow: 'hidden'  }}> 
      <LineChart
        height={chartSize.height- (title ? 20 : 0)} // On soustrait la hauteur approx du titre
        width={chartSize.width}
        data={data}
        {...props} // pass all the props
      />
    </div>    
    </div>
  );
};

const MARGIN = { top: 30, right: 80, bottom: 40, left: 80 };

const FOSSIL_SOURCES = ['coal', 'oil', 'gas', 'nuclear'];
const RENEWABLE_SOURCES = ['hydro', 'solar', 'wind', 'biofuel', 'other_renewable'];

const FOSSIL_COLORS = {
  coal: '#e0ac2b',
  oil: '#e85252',
  gas: '#6689c6',
  nuclear: '#9a6fb0',
};

const RENEWABLE_COLOR = '#22c55e';

const LineChart = ({ width, height, data }) => {
  const boundsWidth = width - MARGIN.left - MARGIN.right;
  const boundsHeight = height - MARGIN.top - MARGIN.bottom;

  // Filter for World only, then build one object per year with all the values we need
  const lineData = useMemo(() => {
    return data
      .filter(d => d.country === "World")
      .sort((a, b) => a.year - b.year)
      .map(d => ({
        year: d.year,
        coal: d.coal,
        oil: d.oil,
        gas: d.gas,
        nuclear: d.nuclear,
        // aggregate all renewables into a single value
        renewables: RENEWABLE_SOURCES.reduce((sum, s) => sum + d[s], 0),
      }));
  }, [data]);

  const xScale = useMemo(() => {
    return d3.scaleLinear()
      .domain(d3.extent(lineData, d => d.year))
      .range([0, boundsWidth]);
  }, [lineData, boundsWidth]);

  const yScale = useMemo(() => {
    // find the max across all lines so they share the same y axis
    const allValues = lineData.flatMap(d => [d.coal, d.oil, d.gas, d.nuclear, d.renewables]);
    return d3.scaleLinear()
      .domain([0, d3.max(allValues)])
      .range([boundsHeight, 0])
      .nice();
  }, [lineData, boundsHeight]);

  // build a d3 line generator for a given key
  const buildLine = (key) => d3.line()
    .x(d => xScale(d.year))
    .y(d => yScale(d[key]));

  // last data point used for end-of-line labels
  const lastPoint = lineData[lineData.length - 1];

  const fossilLines = FOSSIL_SOURCES.map(source => (
    <g key={source}>
      <path
        d={buildLine(source)(lineData)}
        fill="none"
        stroke={FOSSIL_COLORS[source]}
        strokeWidth={2}
      />
      <text
        x={boundsWidth + 5}
        y={yScale(lastPoint[source])}
        alignmentBaseline="central"
        fontSize={11}
        fill={FOSSIL_COLORS[source]}
      >
        {source}
      </text>
    </g>
  ));

  // x axis ticks
  const xTicks = xScale.ticks(6).map((value, i) => (
    <g key={i} transform={`translate(${xScale(value)}, 0)`}>
      <line y1={0} y2={boundsHeight} stroke="#808080" opacity={0.2} />
      <text y={boundsHeight + 20} textAnchor="middle" fontSize={11} fill="#808080">
        {value}
      </text>
    </g>
  ));

  // y axis ticks
  const yTicks = yScale.ticks(5).map((value, i) => (
    <g key={i} transform={`translate(0, ${yScale(value)})`}>
      <line x1={0} x2={boundsWidth} stroke="#808080" opacity={0.2} />
      <text x={-8} textAnchor="end" alignmentBaseline="central" fontSize={11} fill="#808080">
        {value}
      </text>
    </g>
  ));

  return (
    <svg width={width} height={height}>
      {/* <text
        x={width / 2}
        y={MARGIN.top / 2}
        textAnchor="middle"
        fontSize={14}
        fontWeight="bold"
      >
        The Global Evolution of Energy Consumption (1965–2024)
      </text>
      <text
        x={width / 2}
        y={MARGIN.top }
        textAnchor="middle"
        fontSize={14}
      >
        Despite Some Progress, Renewables Remain Far Behind Fossil Fuels
      </text> */}
      <g transform={`translate(${MARGIN.left}, ${MARGIN.top})`}>
        {xTicks}
        {yTicks}
        {fossilLines}
        {/* Renewables line — thicker and bright green, drawn last so it sits on top */}
        <g>
          <path
            d={buildLine('renewables')(lineData)}
            fill="none"
            stroke={RENEWABLE_COLOR}
            strokeWidth={5}
          />
          <text
            x={boundsWidth + 5}
            y={yScale(lastPoint.renewables)}
            alignmentBaseline="central"
            fontSize={11}
            fontWeight="bold"
            fill={RENEWABLE_COLOR}
          >
            renewables
          </text>
        </g>
      </g>
    </svg>
  );
};