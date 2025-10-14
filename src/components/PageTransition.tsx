import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import './PageTransition.css'

interface PageTransitionProps {
  children: ReactNode
}

const PageTransition = ({ children }: PageTransitionProps) => {
  const location = useLocation()
  const [displayLocation, setDisplayLocation] = useState(location)
  const [transitionStage, setTransitionStage] = useState<'fade-in' | 'fade-out'>('fade-in')

  useEffect(() => {
    if (location.pathname !== displayLocation.pathname) {
      setTransitionStage('fade-out')
    }
  }, [location, displayLocation])

  const onAnimationEnd = () => {
    if (transitionStage === 'fade-out') {
      setTransitionStage('fade-in')
      setDisplayLocation(location)
    }
  }

  return (
    <div
      className={`page-transition ${transitionStage}`}
      onAnimationEnd={onAnimationEnd}
    >
      {children}
    </div>
  )
}

export default PageTransition
