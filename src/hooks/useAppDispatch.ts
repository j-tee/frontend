import { useDispatch } from 'react-redux'
import type { AppDispatch } from '../store/index.js'

const useAppDispatch: () => AppDispatch = () => useDispatch<AppDispatch>()

export default useAppDispatch
