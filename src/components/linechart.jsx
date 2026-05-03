import { useRef, useMemo } from "react";
import * as d3 from "d3";
import { useDimensions } from "./use-dimensions";
import { data } from "../energy";

export const ResponsiveLineChart = ({ title, subtitle, hoveredSource, setHoveredSource, ...props }) => {
  const chartRef = useRef(null);
  const chartSize = useDimensions(chartRef);

  return (
    <div ref={chartRef} style={{ 
      width: '100%', 
      height: '100%', 
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column'
    }}> 
      {title && (
        <h3 style={{ margin: '0 0 5px 0', fontSize: '1rem', fontWeight: 'bold', textAlign: 'center', color: '#333', flexShrink: 0 }}>{title}</h3>
      )}
      {subtitle && (
        <h3 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', fontWeight: 'normal', textAlign: 'center', color: '#555', flexShrink: 0 }}>{subtitle}</h3>
      )}
      <div style={{ flex: 1, position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}> 
        <LineChart
          height={chartSize.height - (title ? 50 : 0)} 
          width={chartSize.width}
          data={data}
          hoveredSource={hoveredSource}
          setHoveredSource={setHoveredSource}
          {...props} 
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

const LineChart = ({ width, height, data, hoveredSource, setHoveredSource }) => {
  const boundsWidth = width - MARGIN.left - MARGIN.right;
  const boundsHeight = height - MARGIN.top - MARGIN.bottom;

  const normalizedHover = hoveredSource ? String(hoveredSource).toLowerCase() : null;

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
        renewables: RENEWABLE_SOURCES.reduce((sum, s) => sum + d[s], 0),
      }));
  }, [data]);

  const xScale = useMemo(() => {
    return d3.scaleLinear().domain(d3.extent(lineData, d => d.year)).range([0, boundsWidth]);
  }, [lineData, boundsWidth]);

  const yScale = useMemo(() => {
    const allValues = lineData.flatMap(d => [d.coal, d.oil, d.gas, d.nuclear, d.renewables]);
    return d3.scaleLinear().domain([0, d3.max(allValues)]).range([boundsHeight, 0]).nice();
  }, [lineData, boundsHeight]);

  const buildLine = (key) => d3.line().x(d => xScale(d.year)).y(d => yScale(d[key]));
  const lastPoint = lineData[lineData.length - 1];

  const getOpacity = (sourceName) => {
    if (!normalizedHover) return 1;

    // Cas 1 : Correspondance exacte (Fossiles/Nucléaire)
    if (normalizedHover === sourceName.toLowerCase()) return 1;

    // Cas 2 : Spécifique aux Renewables
    // Si la source actuelle est 'renewables' ET que ce qu'on survole est une renewable (solar, wind, etc.)
    if (sourceName === 'renewables' && RENEWABLE_SOURCES.includes(normalizedHover)) {
      return 1;
    }
    
    // Cas 3 : Inverse (si on survole 'renewables' sur le linechart, on veut allumer les renewables du treemap)
    // Géré par le composant Treemap, pas besoin de logique ici pour ça.

    return 0.2;
  };

  const fossilLines = FOSSIL_SOURCES.map(source => {
    const opacity = getOpacity(source);
    return (
      <g key={source} style={{ opacity, transition: "opacity 200ms" }}>
        <path
          d={buildLine(source)(lineData)}
          fill="none"
          stroke={FOSSIL_COLORS[source]}
          strokeWidth={2}
          onMouseEnter={() => setHoveredSource(source)}
          onMouseLeave={() => setHoveredSource(null)}
          style={{ cursor: 'pointer' }}
        />
        <text
          x={boundsWidth + 5}
          y={yScale(lastPoint[source])}
          alignmentBaseline="central"
          fontSize={11}
          fill={FOSSIL_COLORS[source]}
          opacity={opacity > 0.5 ? 1 : 0.5}
        >
          {source}
        </text>
      </g>
    );
  });

  const renewablesOpacity = getOpacity('renewables');

  const xTicks = xScale.ticks(6).map((value, i) => (
    <g key={i} transform={`translate(${xScale(value)}, 0)`}>
      <line y1={0} y2={boundsHeight} stroke="#808080" opacity={0.2} />
      <text y={boundsHeight + 20} textAnchor="middle" fontSize={11} fill="#808080">{value}</text>
    </g>
  ));

  const yTicks = yScale.ticks(5).map((value, i) => (
    <g key={i} transform={`translate(0, ${yScale(value)})`}>
      <line x1={0} x2={boundsWidth} stroke="#808080" opacity={0.2} />
      <text x={-8} textAnchor="end" alignmentBaseline="central" fontSize={11} fill="#808080">{value}</text>
    </g>
  ));

  return (
    <svg width={width} height={height}>
      <g transform={`translate(${MARGIN.left}, ${MARGIN.top})`}>
        {xTicks}
        {yTicks}
        {fossilLines}
        <g style={{ opacity: renewablesOpacity, transition: "opacity 200ms" }}>
          <path
            d={buildLine('renewables')(lineData)}
            fill="none"
            stroke={RENEWABLE_COLOR}
            strokeWidth={5}
            onMouseEnter={() => setHoveredSource('renewables')}
            onMouseLeave={() => setHoveredSource(null)}
            style={{ cursor: 'pointer' }}
          />
          <text
            x={boundsWidth + 5}
            y={yScale(lastPoint.renewables)}
            alignmentBaseline="central"
            fontSize={11}
            fontWeight="bold"
            fill={RENEWABLE_COLOR}
            opacity={renewablesOpacity > 0.5 ? 1 : 0.5}
          >
            renewables
          </text>
        </g>
      </g>
    </svg>
  );
};