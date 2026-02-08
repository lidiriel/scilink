import { useState } from 'react'
import '../css/Test.scss'

function Test() {
  const [clicked, setClicked] = useState(false)

  return (
    <div className="test">
      <button onClick={() => setClicked(!clicked)}>
        {clicked ? 'Clicked!' : 'Click me'}
      </button>
    </div>
  )
}

export default Test
