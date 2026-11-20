import { Suspense } from "react"
import "../App.css"
import "../theme.css"
import AppRouter from "../routes/router"
import Skeleton from "../components/ui/Skeleton"

function App() {
  return (
    <Suspense fallback={<Skeleton lines={6} />}>
      <AppRouter />
    </Suspense>
  )
}

export default App
