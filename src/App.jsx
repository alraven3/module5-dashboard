import './App.css'
import { ResponsiveBarplot } from './components/barchart'
import { ResponsiveTreemap } from './components/treemap'
import { ResponsiveLineChart } from './components/linechart'

function App() {

  return (
    <div className='dashboard'>
      <header className='dashboard-header'>
        <h1>Global Energy Dashboard</h1>
        <p>All energy values are in TWh (terawatt-hours)</p>
      </header>
      <div className='dashboard-content'>
        <ResponsiveBarplot title={"Top 5 Countries by Energy Consumption (2024)"}/>
        <ResponsiveTreemap title={"World Energy Mix (2024)"} />
        <ResponsiveLineChart style={{gridColumn: '1 / 3'}} 
          title={"The Global Evolution of Energy Consumption (1965-2024)"} 
          subtitle={"Despite Some Progress, Renewables Remain Far Behind Fossil Fuels"} />
      </div>
      <p className='footer'>Source: Our World in Data</p>
    </div>
  )
}

export default App
