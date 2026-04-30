import React from 'react'
import { motion } from 'framer-motion'

const variants = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0,  transition: { duration: 0.38, ease: [0.25, 0.46, 0.45, 0.94] } },
  exit:    { opacity: 0, y: -8, transition: { duration: 0.22, ease: 'easeIn' } },
}

export default function PageWrapper({ children, className = '' }) {
  return (
    <motion.div
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={`w-full mx-auto px-3 sm:px-4 md:px-6 py-6 sm:py-8 md:py-12 max-w-6xl ${className}`}
    >
      {children}
    </motion.div>
  )
}
