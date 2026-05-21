import { useRef, useMemo, useState } from "react";
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
      flexDirection: 'column',
      position: 'relative' // Important pour le positionnement absolu du tooltip
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
  const svgRef = useRef(null); // Ref pour le SVG lui-même
  const boundsWidth = width - MARGIN.left - MARGIN.right;
  const boundsHeight = height - MARGIN.top - MARGIN.bottom;

  const [activeTooltip, setActiveTooltip] = useState(null);
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

  const findNearestData = (mouseX) => {
    const yearAtMouse = xScale.invert(mouseX);
    const bisector = d3.bisector(d => d.year).left;
    const index = bisector(lineData, yearAtMouse);
    
    const d0 = lineData[index - 1];
    const d1 = lineData[index];
    
    if (!d0) return d1;
    if (!d1) return d0;
    
    return (yearAtMouse - d0.year < d1.year - yearAtMouse) ? d0 : d1;
  };

  const handleLineHover = (sourceKey, label, color, event) => {
    // On utilise toujours d3.pointer pour la précision
    const [mouseX] = d3.pointer(event);
    const nearestData = findNearestData(mouseX);

    if (nearestData) {
      const x = xScale(nearestData.year);
      const y = yScale(nearestData[sourceKey]);
      const value = nearestData[sourceKey];
      
      // On stocke les coordonnées pour le tooltip HTML
      setActiveTooltip({ 
        x, 
        y, 
        year: nearestData.year, 
        value, 
        label, 
        color 
      });
    }
  };

  const handleMouseLeave = () => {
    setActiveTooltip(null);
  };

  const getOpacity = (sourceName) => {
    if (normalizedHover) {
      if (normalizedHover === sourceName.toLowerCase()) return 1;
      if (sourceName === 'renewables' && RENEWABLE_SOURCES.includes(normalizedHover)) return 1;
      return 0.2;
    }

    if (activeTooltip) {
      if (activeTooltip.label.toLowerCase() === sourceName.toLowerCase()) return 1;
      if (sourceName === 'renewables' && activeTooltip.label.toLowerCase() === 'renewables') return 1;
      return 0.2;
    }

    return 1;
  };

  const renderLineGroup = (sourceKey, label, color, strokeWidth = 2) => {
    const opacity = getOpacity(sourceKey);
    
    return (
      <g key={sourceKey} style={{ opacity, transition: "opacity 200ms" }}>
        {/* Zone de détection invisible (large) */}
        <path
          d={buildLine(sourceKey)(lineData)}
          fill="none"
          stroke="transparent"
          strokeWidth={Math.max(strokeWidth + 15, 20)}
          onMouseMove={(e) => handleLineHover(sourceKey, label, color, e)}
          onMouseLeave={handleMouseLeave}
          style={{ cursor: 'pointer' }}
        />
        
        {/* Ligne visible */}
        <path
          d={buildLine(sourceKey)(lineData)}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          pointerEvents="none"
        />
        
        {/* Label */}
        <text
          x={boundsWidth + 5}
          y={yScale(lastPoint[sourceKey])}
          alignmentBaseline="central"
          fontSize={11}
          fill={color}
          opacity={opacity > 0.5 ? 1 : 0.5}
          pointerEvents="none"
        >
          {label}
        </text>
      </g>
    );
  };

  const fossilLines = FOSSIL_SOURCES.map(source => {
    const label = source.charAt(0).toUpperCase() + source.slice(1);
    return renderLineGroup(source, label, FOSSIL_COLORS[source], 2);
  });

  const renewablesOpacity = getOpacity('renewables');
  const renewablesLabel = "Renewables";

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <svg ref={svgRef} width={width} height={height} style={{ display: 'block' }}>
        <g transform={`translate(${MARGIN.left}, ${MARGIN.top})`}>
          {/* Axes et Grilles */}
          {xScale.ticks(6).map((value, i) => (
            <g key={i} transform={`translate(${xScale(value)}, 0)`}>
              <line y1={0} y2={boundsHeight} stroke="#808080" opacity={0.2} />
              <text y={boundsHeight + 20} textAnchor="middle" fontSize={11} fill="#808080">{value}</text>
            </g>
          ))}
          {yScale.ticks(5).map((value, i) => (
            <g key={i} transform={`translate(0, ${yScale(value)})`}>
              <line x1={0} x2={boundsWidth} stroke="#808080" opacity={0.2} />
              <text x={-8} textAnchor="end" alignmentBaseline="central" fontSize={11} fill="#808080">{value}</text>
            </g>
          ))}

          {/* Lignes Fossiles */}
          {fossilLines}

          {/* Ligne Renouvelables */}
          <g style={{ opacity: renewablesOpacity, transition: "opacity 200ms" }}>
            <path
              d={buildLine('renewables')(lineData)}
              fill="none"
              stroke="transparent"
              strokeWidth={35}
              onMouseMove={(e) => handleLineHover('renewables', renewablesLabel, RENEWABLE_COLOR, e)}
              onMouseLeave={handleMouseLeave}
              style={{ cursor: 'pointer' }}
            />
            <path
              d={buildLine('renewables')(lineData)}
              fill="none"
              stroke={RENEWABLE_COLOR}
              strokeWidth={5}
              pointerEvents="none"
            />
            <text
              x={boundsWidth + 5}
              y={yScale(lastPoint.renewables)}
              alignmentBaseline="central"
              fontSize={11}
              fontWeight="bold"
              fill={RENEWABLE_COLOR}
              opacity={renewablesOpacity > 0.5 ? 1 : 0.5}
              pointerEvents="none"
            >
              {renewablesLabel}
            </text>
          </g>
          
          {/* Cercle de pointage (optionnel, reste dans le SVG pour être sûr qu'il soit sous le tooltip HTML) */}
          {activeTooltip && (
             <circle 
                cx={activeTooltip.x} 
                cy={activeTooltip.y} 
                r={6} 
                fill={activeTooltip.color} 
                stroke="#fff" 
                strokeWidth={2} 
                pointerEvents="none"
             />
          )}
        </g>
      </svg>

      {/* Tooltip HTML ABSOLU (Hors du SVG) */}
      {activeTooltip && (
        <div
          style={{
            position: 'absolute',
            left: MARGIN.left + activeTooltip.x + 10, // Décalage par rapport au conteneur
            top: MARGIN.top + activeTooltip.y - 25,
            width: '140px',
            padding: '8px',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            border: '1px solid #ddd',
            borderRadius: '4px',
            boxShadow: '0px 2px 4px rgba(0,0,0,0.1)',
            pointerEvents: 'none', // CRUCIAL : La souris traverse le tooltip pour rester sur la ligne
            zIndex: 1000,
            fontSize: '11px',
            color: '#333'
          }}
        >
          <div style={{ fontWeight: 'bold', marginBottom: '4px', color: activeTooltip.color }}>
            {activeTooltip.label}
          </div>
          <div style={{ color: '#555' }}>Year: {activeTooltip.year}</div>
          <div style={{ fontWeight: 'bold', color: activeTooltip.color }}>
            Value: {Math.round(activeTooltip.value)} TWh
          </div>
        </div>
      )}
    </div>
  );
};