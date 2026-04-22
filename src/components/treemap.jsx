import { useRef, useMemo } from "react";
import * as d3 from "d3";
import { useDimensions } from "./use-dimensions";
import { data } from "../energy";

export const ResponsiveTreemap = ({title, ...props}) => {
  const chartRef = useRef(null);
  const chartSize = useDimensions(chartRef);
  return (
    // <div ref={chartRef} style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
    //   <Treemap
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
      <div ref={chartRef} style={{ flex: 1, position: 'relative', width: '100%', height: '100%', overflow: 'hidden'  }}> 
        <Treemap
          height={chartSize.height- (title ? 20 : 0)} // On soustrait la hauteur approx du titre
          width={chartSize.width}
          data={data}
          {...props} // pass all the props
        />
      </div>    
      </div>
  );
};

const MARGIN = { top: 30, right: 10, bottom: 10, left: 10 };

const colors = [
  "#e0ac2b",
  "#e85252",
  "#6689c6",
  "#9a6fb0",
  "#a53253",
  "#69b3a2",
  "#f0a500",
  "#3dbdb1",
  "#c94f7c",
];

const ENERGY_SOURCES = ['coal', 'oil', 'gas', 'nuclear', 'hydro', 'solar', 'wind', 'biofuel', 'other_renewable'];

const Treemap = ({ width, height, data }) => {
  const boundsWidth = width - MARGIN.left - MARGIN.right;
  const boundsHeight = height - MARGIN.top - MARGIN.bottom;

  const treeData = useMemo(() => {
    const world2024 = data.find(d => d.country === "World" && d.year === 2024);
    return ENERGY_SOURCES.map(source => ({
      source,
      value: world2024[source]
    }));
  }, [data]);
  // d3.hierarchy() expects a tree structure, so we wrap our flat array in a root node with "children"
    // .sum() traverses the tree and sets the "value" property on each node, which the treemap layout uses to determine tile sizes
  const hierarchy = useMemo(() => {
    return d3.hierarchy({ children: treeData }).sum(d => d.value);
  }, [treeData]);
  // d3.treemap() computes the x0, y0, x1, y1 coordinates for each tile based on the hierarchy values
    // .size() sets the total dimensions the treemap should fill
    // .padding() adds a gap in pixels between tiles
    // calling the generator on the hierarchy mutates it in place, adding the coordinates to each node
  const treemap = useMemo(() => {
    const treemapGenerator = d3.treemap()
      .size([boundsWidth, boundsHeight])
      .padding(4);
    return treemapGenerator(hierarchy);
  }, [hierarchy, boundsWidth, boundsHeight]);
  // .leaves() returns only the leaf nodes (i.e. the actual data items, not the root wrapper)
    // each leaf has x0, y0, x1, y1 which we use to position and size the <rect> elements
  const leaves = treemap.leaves().map((leaf, i) => {
    return (
      <g key={i} transform={`translate(${leaf.x0}, ${leaf.y0})`}>
        <rect
          width={leaf.x1 - leaf.x0}
          height={leaf.y1 - leaf.y0}
          fill={colors[i]}
          opacity={0.8}
          rx={2}
        />
        <text
          x={4}
          y={16}
          fontSize={12}
          fill="black"
        >
          {leaf.data.source}
        </text>
        <text 
            x={4}
            y={30}
            fontSize={12}
            fill="white"
            opacity={.8}  >
            {leaf.data.value}          
        </text>
      </g>
    );
  });

  return (
    <svg width={width} height={height}>
      {/* <text
        x={width / 2}
        y={MARGIN.top / 2}
        textAnchor="middle"
        fontSize={14}
        fontWeight="bold"
      >
        World Energy Mix (2024)
      </text> */}
      <g transform={`translate(${MARGIN.left}, ${MARGIN.top})`}>
        {leaves}
      </g>
    </svg>
  );
};