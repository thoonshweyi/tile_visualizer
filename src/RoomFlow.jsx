import { useState } from 'react'

import RoomLibrary from './components/room-flow/RoomLibrary'
import Workspace from './components/room-flow/Workspace'

export default function RoomFlow() {
  const [workspaceRoom, setWorkspaceRoom] = useState(null)

  return workspaceRoom
    ? <Workspace room={workspaceRoom} onChangeRoom={() => setWorkspaceRoom(null)} />
    : <RoomLibrary onContinue={setWorkspaceRoom} />
}
