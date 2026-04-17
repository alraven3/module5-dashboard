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
        <ResponsiveBarplot />
        <ResponsiveTreemap />
        <ResponsiveLineChart style={{gridColumn: '1 / 3'}} />
        {/* <ResponsiveStackedArea /> */}
      </div>
      <p className='footer'>Source: Our World in Data</p>
    </div>
  )
}

export default App
