import { useState } from 'react'
import './App.css'

import { Button } from "@/components/ui/button"


function App() {

  return (
    <>
      <div>        
        <h1 className="text-3xl underline">
          Edit and save to test HMR
        </h1>
        <Button>Click me</Button>
      </div>
    </>
  )
}

export default App
