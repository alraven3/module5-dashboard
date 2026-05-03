import { useRef, useMemo } from "react";
import * as d3 from "d3";
import { useDimensions } from "./use-dimensions";
import { data } from "../energy";

export const ResponsiveTreemap = ({ title, hoveredSource, setHoveredSource, ...props }) => {
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
        <h3 style={{ margin: '0 0 10px 0', fontSize: '1rem', fontWeight: 'bold', textAlign: 'center', color: '#333', flexShrink: 0 }}>{title}</h3>
      )}
      <div style={{ flex: 1, position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}> 
        <Treemap
          height={chartSize.height - (title ? 40 : 0)} 
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

const MARGIN = { top: 10, right: 10, bottom: 10, left: 10 };

const colors = [
  "#e0ac2b", "#e85252", "#6689c6", "#9a6fb0", "#a53253",
  "#69b3a2", "#f0a500", "#3dbdb1", "#c94f7c",
];

const ENERGY_SOURCES = ['coal', 'oil', 'gas', 'nuclear', 'hydro', 'solar', 'wind', 'biofuel', 'other_renewable'];
const RENEWABLE_SOURCES = ['hydro', 'solar', 'wind', 'biofuel', 'other_renewable'];

const Treemap = ({ width, height, data, hoveredSource, setHoveredSource }) => {
  const boundsWidth = width - MARGIN.left - MARGIN.right;
  const boundsHeight = height - MARGIN.top - MARGIN.bottom;

  const normalizedHover = hoveredSource ? String(hoveredSource).toLowerCase() : null;

  const treeData = useMemo(() => {
    const world2024 = data.find(d => d.country === "World" && d.year === 2024);
    if (!world2024) return [];
    return ENERGY_SOURCES.map(source => ({
      source,
      value: world2024[source] || 0
    }));
  }, [data]);

  const hierarchy = useMemo(() => {
    return d3.hierarchy({ children: treeData }).sum(d => d.value);
  }, [treeData]);

  const treemapLayout = useMemo(() => {
    return d3.treemap().size([boundsWidth, boundsHeight]).padding(4);
  }, [boundsWidth, boundsHeight]);

  const root = treemapLayout(hierarchy);
  const leaves = root.leaves();

  return (
    <svg width={width} height={height}>
      <g transform={`translate(${MARGIN.left}, ${MARGIN.top})`}>
        {leaves.map((leaf, i) => {
          const sourceName = leaf.data.source;
          const sourceNameLower = sourceName.toLowerCase();
          
          let isHighlighted = false;

          // Cas 1 : Rien n'est survolé -> Tout allumé
          if (!normalizedHover) {
            isHighlighted = true;
          } 
          // Cas 2 : Correspondance exacte (ex: hover "coal", source "coal")
          else if (normalizedHover === sourceNameLower) {
            isHighlighted = true;
          }
          // Cas 3 : On survole une renewable (ex: "solar") dans le Treemap -> On allume TOUTES les renewables
          // (Ceci sert surtout si vous avez d'autres graphes, mais garde la cohérence interne)
          else if (RENEWABLE_SOURCES.includes(normalizedHover) && RENEWABLE_SOURCES.includes(sourceNameLower)) {
             // Optionnel : Si vous voulez que survoler "solar" allume aussi "wind" dans le treemap.
             // Si non, commentez cette ligne.
             // isHighlighted = true; 
             // Pour l'instant, laissons chaque case indépendante sauf si hover vient du LineChart.
          }
          // Cas 4 : On survole "renewables" (venant du LineChart) -> On allume TOUTES les cases renewables du Treemap
          else if (normalizedHover === 'renewables' && RENEWABLE_SOURCES.includes(sourceNameLower)) {
            isHighlighted = true;
          }
          
          const opacity = isHighlighted ? 1 : 0.2;
          const textOpacity = isHighlighted ? 1 : 0.4;

          return (
            <g 
              key={i} 
              transform={`translate(${leaf.x0}, ${leaf.y0})`}
              style={{ transition: "opacity 200ms" }}
              onMouseEnter={() => setHoveredSource(sourceName)}
              onMouseLeave={() => setHoveredSource(null)}
            >
              <rect
                width={leaf.x1 - leaf.x0}
                height={leaf.y1 - leaf.y0}
                fill={colors[i % colors.length]}
                rx={2}
                opacity={opacity}
              />
              <text
                x={4}
                y={16}
                fontSize={12}
                fill="black"
                opacity={textOpacity}
              >
                {sourceName}
              </text>
              <text 
                x={4}
                y={32}
                fontSize={11}
                fill="white"
                opacity={textOpacity * 0.8}
              >
                {Math.round(leaf.data.value)}          
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
};