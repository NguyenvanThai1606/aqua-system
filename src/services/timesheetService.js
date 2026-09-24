import { isFirebaseConfigured } from '../lib/firebase'
import * as firestoreBackend from './firestoreTimesheetAdjustmentService'
import * as localBackend from './localTimesheetAdjustmentService'

const backend = isFirebaseConfigured() ? firestoreBackend : localBackend

export const listAdjustments = backend.listAdjustments
export const createAdjustment = backend.createAdjustment
export const updateAdjustment = backend.updateAdjustment
export const deleteAdjustment = backend.deleteAdjustment