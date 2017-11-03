//@flow
import * as React from 'react';
import './App.css'

const WIRE_COLORS = ['black', 'white', 'blue', 'pink']

// How frequently we poll the server for changes
const POLL_FREQUENCY = 100 // ms
const POLL_TIMEOUT = 1500 // ms

// const SERVER_URL = 'https://starship-server.herokuapp.com'
const SERVER_URL = 'http://localhost:9000'


type timestamp = number
type seconds = number

type Port = {
  wire: ?number,
  isOnline: boolean,
}

type Bay = Array<Port>

type Weapon = {
  name: string,
  sequence: *,
  duration: seconds,
}

type AppState = {
  bays: Array<Bay>,
  enemies: *,
  weaponStartTime: ?timestamp,
  weapon: ?Weapon,
  gameOver: boolean,
  score: number,
}

const fetchServer = path => {
  function timeout(ms, promise) {
    return new Promise(function(resolve, reject) {
      setTimeout(function() {
        reject(new Error('timeout'))
      }, ms)
      promise.then(resolve, reject)
    })
  }
  return timeout(POLL_TIMEOUT, fetch(`${SERVER_URL}/${path}`))
  .then(response => response.json())
  .catch((error: Object) => {
    // alert('Whoops! The game broke. Check the error console.')
    console.error(error)
  })
}

type PortIndicatorProps = {
  wire: number,
  isOnline: boolean,
  cycleWire: any,
  disconnectWire: any,
}

function PortIndicator(props: PortIndicatorProps) {
  const wireColor = (props.wire === null) ? 'none' : WIRE_COLORS[props.wire]
  const isOnline = props.isOnline
  return (
    <div className={`Port Wire-${wireColor}`} onClick={props.cycleWire}>
      <div className="Port-wire-label">{props.wire}</div>
      <div
        className={`Port-status Port-status-${isOnline ? 'online' : 'offline'}`}
        onClick={props.disconnectWire}
      />
    </div>
  )
}

type WeaponStatusProps = {
  weapon: ?Weapon,
  weaponStartTime: ?timestamp,
}

function didWeaponTimeExpire(weapon: Weapon, weaponStartTime: timestamp): boolean {
  const millisRemaining = Date.now() - weaponStartTime
  return millisRemaining > weapon.duration * 1000
}

function weaponTimeRemainingPercent(weapon: Weapon, weaponStartTime: timestamp): number {
  const millisRemaining = Date.now() - weaponStartTime
  const weaponDurationMillis = weapon.duration * 1000
  return 1 - (millisRemaining / weaponDurationMillis)
}

function weaponTimeRemainingSeconds(weapon: Weapon, weaponStartTime: timestamp): number {
  const millisRemaining = Date.now() - weaponStartTime
  const weaponDurationMillis = weapon.duration * 1000
  return (weaponDurationMillis - millisRemaining) / 1000
}

function WeaponStatus(props: WeaponStatusProps) {
  const {weapon, weaponStartTime} = props
  if (weapon && weaponStartTime && !didWeaponTimeExpire(weapon, weaponStartTime)) {
    const weaponTimePercent = weaponTimeRemainingPercent(weapon, weaponStartTime)
    const weaponTimeSeconds = weaponTimeRemainingSeconds(weapon, weaponStartTime)
    return (
      <div className="WeaponStatus">
        <div className="WeaponStatus-name">{weapon.name}</div>
        <div
          className="WeaponStatus-duration"
          style={{width: 400 * weaponTimePercent}}>
          {weaponTimeSeconds.toFixed(1)}
        </div>
      </div>
    )
  } else {
    return (
      <div className="WeaponStatus">WEAPON OFFLINE</div>
    )
  }

}

class App extends React.Component<{}, AppState> {

  componentDidMount() {
    this.onPollTimer()
    setInterval(this.onPollTimer.bind(this), POLL_FREQUENCY)
  }

  onPollTimer() {
    fetchServer('state')
    .then(state => this.setState(state))
  }

  connectWire(wire: number, port: number, bay: number) {
    fetchServer(`connect/wire/${wire}/port/${port}/bay/${bay}`)
    .then(state => this.setState(state))
  }

  disconnectWire(port: number, bay: number) {
    fetchServer(`disconnect/port/${port}/bay/${bay}`)
    .then(state => this.setState(state))
  }

  cycleWire(port: number, bay: number) {
    const numWires = 4
    const currentWire = this.state.bays[bay][port].wire
    if (currentWire === null) {
      this.connectWire(0, port, bay)
    }
    else if (currentWire + 1 === numWires) {
      this.disconnectWire(port, bay)
    } else {
      const nextWire = currentWire + 1
      this.connectWire(nextWire, port, bay)
    }
  }

  render() {
    if (!this.state) return "loading"
    return (
      <div className="App">
        <WeaponStatus weaponStartTime={this.state.weaponStartTime} weapon={this.state.weapon}/>
        <div className="Bays">
          {
            this.state.bays.map((ports: Array<any>, bayNum) => (
              <div className="Bay" key={bayNum}>
                <div className="Bay-name">{`Bay ${bayNum}`}</div>
                {
                  ports.map((attrs: {wire: number, isOnline: boolean}, portNum) => (
                    <PortIndicator
                      key={portNum}
                      cycleWire={() => this.cycleWire(portNum, bayNum)}
                      disconnectWire={() => this.disconnectWire(portNum, bayNum)}
                      {...attrs}
                    />
                  ))
                 }
              </div>
            ))
          }
        </div>
      </div>
    );
  }

}

export default App;
