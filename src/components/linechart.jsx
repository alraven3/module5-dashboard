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

  // Fonction robuste pour trouver l'année la plus proche
  const findNearestData = (mouseX) => {
    // 1. Convertir la position souris en année
    const yearAtMouse = xScale.invert(mouseX);
    
    // 2. Utiliser bisector pour trouver l'index d'insertion
    const bisector = d3.bisector(d => d.year).left;
    const index = bisector(lineData, yearAtMouse);
    
    // 3. Comparer l'année précédente et suivante pour trouver la plus proche
    const d0 = lineData[index - 1];
    const d1 = lineData[index];
    
    // Si on est avant la première donnée
    if (!d0) return d1;
    // Si on est après la dernière donnée
    if (!d1) return d0;
    
    // Retourner celle qui est la plus proche mathématiquement
    return (yearAtMouse - d0.year < d1.year - yearAtMouse) ? d0 : d1;
  };

  // Gestion du survol local (Linechart -> Tooltip)
  // L'argument 'event' est l'événement React natif
  const handleLineHover = (sourceKey, label, color, event) => {
    // CORRECTION ICI : d3.pointer utilise les coordonnées relatives à la cible de l'événement (le path SVG)
    // Cela évite les problèmes de marges CSS et de positionnement absolu
    const [mouseX, mouseY] = d3.pointer(event);
    
    // On s'assure que mouseX est bien dans les bornes du graphique (0 à boundsWidth)
    // (d3.pointer le fait déjà relatif au SVG, mais on vérifie la logique)
    
    const nearestData = findNearestData(mouseX);

    if (nearestData) {
      const x = xScale(nearestData.year);
      const y = yScale(nearestData[sourceKey]);
      const value = nearestData[sourceKey];
      
      setActiveTooltip({ x, y, year: nearestData.year, value, label, color });
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

  const fossilLines = FOSSIL_SOURCES.map(source => {
    const opacity = getOpacity(source);
    const color = FOSSIL_COLORS[source];
    const label = source.charAt(0).toUpperCase() + source.slice(1);

    return (
      <g key={source} style={{ opacity, transition: "opacity 200ms" }}>
        <path
          d={buildLine(source)(lineData)}
          fill="none"
          stroke={color}
          strokeWidth={2}
          onMouseMove={(e) => handleLineHover(source, label, color, e)}
          onMouseLeave={handleMouseLeave}
          style={{ cursor: 'pointer' }}
        />
        <text
          x={boundsWidth + 5}
          y={yScale(lastPoint[source])}
          alignmentBaseline="central"
          fontSize={11}
          fill={color}
          opacity={opacity > 0.5 ? 1 : 0.5}
        >
          {label}
        </text>
      </g>
    );
  });

  const renewablesOpacity = getOpacity('renewables');
  const renewablesLabel = "Renewables";

  return (
    <svg width={width} height={height}>
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
            stroke={RENEWABLE_COLOR}
            strokeWidth={5}
            onMouseMove={(e) => handleLineHover('renewables', renewablesLabel, RENEWABLE_COLOR, e)}
            onMouseLeave={handleMouseLeave}
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
            {renewablesLabel}
          </text>
        </g>

        {/* Rendu du Tooltip (si actif) */}
        {activeTooltip && (
          <g transform={`translate(${activeTooltip.x}, ${activeTooltip.y})`}>
            {/* Cercle sur le point */}
            <circle r={6} fill={activeTooltip.color} stroke="#fff" strokeWidth={2} />
            
            {/* Boîte de texte */}
            <rect 
              x={10} 
              y={-25} 
              width={140} 
              height={57} 
              rx={4} 
              fill="rgba(255, 255, 255, 0.95)" 
              stroke="#ddd" 
              strokeWidth={1}
              filter="drop-shadow(0px 2px 4px rgba(0,0,0,0.1))"
            />
            
            {/* Texte du Tooltip */}
            <text x={18} y={-5} fontSize={12} fontWeight="bold" fill="#333">
              {activeTooltip.label}
            </text>
            <text x={18} y={12} fontSize={11} fill="#555">
              Year: {activeTooltip.year}
            </text>
            <text x={18} y={26} fontSize={11} fontWeight="bold" fill={activeTooltip.color}>
              Value: {Math.round(activeTooltip.value)} TWh
            </text>
          </g>
        )}
      </g>
    </svg>
  );
};