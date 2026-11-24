import type { CustomerInput, VehicleInput } from '@shared/registry'

export const emptyCustomer = (name = ''): CustomerInput => ({ type: 'PF', name })
export const emptyVehicle = (plate = ''): VehicleInput => ({ plate, fuel: 'Flex' })
