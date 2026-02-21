export const ugandaRegionOptions = [
  { value: 'central', label: 'Central Region' },
  { value: 'eastern', label: 'Eastern Region' },
  { value: 'northern', label: 'Northern Region' },
  { value: 'western', label: 'Western Region' },
]

export const ugandaDistrictsByRegion = {
  central: ['Kampala', 'Wakiso', 'Mukono', 'Mpigi', 'Luwero', 'Masaka', 'Mityana', 'Buikwe', 'Kalungu', 'Kyotera'],
  eastern: ['Jinja', 'Mbale', 'Soroti', 'Tororo', 'Busia', 'Iganga', 'Kamuli', 'Bugiri', 'Kapchorwa', 'Pallisa'],
  northern: ['Gulu', 'Lira', 'Arua', 'Kitgum', 'Pader', 'Moroto', 'Adjumani', 'Nebbi', 'Nwoya', 'Oyam'],
  western: ['Mbarara', 'Fort Portal', 'Hoima', 'Masindi', 'Kabale', 'Bushenyi', 'Kasese', 'Kyenjojo', 'Ntungamo', 'Rukungiri'],
}

export const ugandaLandTenureOptions = [
  { value: 'mailo_private', label: 'Private Mailo' },
  { value: 'mailo_official', label: 'Official Mailo' },
  { value: 'freehold', label: 'Freehold' },
  { value: 'leasehold', label: 'Leasehold' },
  { value: 'customary', label: 'Customary' },
]

export const ugandaLandTenureValues = ugandaLandTenureOptions.map((option) => option.value)

export function getDistrictOptionsForRegion(region) {
  const normalizedRegion = String(region || '').trim().toLowerCase()
  const districts = ugandaDistrictsByRegion[normalizedRegion] || []
  return districts.map((district) => ({ value: district, label: district }))
}

export function getRegionLabel(value) {
  const match = ugandaRegionOptions.find((option) => option.value === value)
  return match?.label || ''
}

export function getLandTenureLabel(value) {
  const match = ugandaLandTenureOptions.find((option) => option.value === value)
  return match?.label || ''
}
