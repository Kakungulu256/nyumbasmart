import { z } from 'zod'

import { ugandaLandTenureValues } from '@/features/listings/constants/ugandaLandMetadata'

export const propertyTypeOptions = [
  { value: 'apartment', label: 'Apartment' },
  { value: 'house', label: 'House' },
  { value: 'duplex', label: 'Duplex' },
  { value: 'land', label: 'Land' },
  { value: 'room', label: 'Room' },
  { value: 'studio', label: 'Studio' },
  { value: 'commercial', label: 'Commercial' },
]

export const paymentFrequencyOptions = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annually', label: 'Annually' },
]

export const listingIntentOptions = [
  { value: 'rent', label: 'For Rent' },
  { value: 'sale', label: 'For Sale' },
]

const listingFormBaseSchema = z.object({
  title: z.string().trim().min(6, 'Title must be at least 6 characters.').max(140, 'Title cannot exceed 140 characters.'),
  description: z
    .string()
    .trim()
    .min(30, 'Description must be at least 30 characters.')
    .max(2000, 'Description cannot exceed 2000 characters.'),
  listingIntent: z.enum(['rent', 'sale']),
  propertyType: z.enum(['apartment', 'house', 'duplex', 'land', 'room', 'studio', 'commercial']),
  rentAmount: z.coerce.number().int('Rent must be a whole number.').min(0, 'Rent cannot be negative.'),
  currency: z.string().trim().length(3, 'Currency must be a 3-letter code.'),
  paymentFrequency: z.enum(['monthly', 'quarterly', 'annually']),
  bedrooms: z.coerce.number().int('Bedrooms must be a whole number.').min(0).max(20),
  bathrooms: z.coerce.number().int('Bathrooms must be a whole number.').min(0).max(20),
  address: z.string().trim().min(5, 'Address is required.').max(240, 'Address cannot exceed 240 characters.'),
  neighborhood: z.string().trim().max(120, 'Neighborhood cannot exceed 120 characters.').optional().or(z.literal('')),
  city: z.string().trim().min(2, 'City is required.').max(80, 'City cannot exceed 80 characters.'),
  country: z.string().trim().length(2, 'Country must be a 2-letter code.'),
  region: z.string().trim().max(40, 'Region cannot exceed 40 characters.').optional().or(z.literal('')),
  district: z.string().trim().max(80, 'District cannot exceed 80 characters.').optional().or(z.literal('')),
  landTenureType: z.union([z.enum(ugandaLandTenureValues), z.literal('')]).optional(),
  latitude: z.coerce.number().min(-90, 'Latitude must be between -90 and 90.').max(90, 'Latitude must be between -90 and 90.'),
  longitude: z
    .coerce
    .number()
    .min(-180, 'Longitude must be between -180 and 180.')
    .max(180, 'Longitude must be between -180 and 180.'),
  availableFrom: z.string().optional(),
  amenitiesText: z.string().max(500, 'Amenities text is too long.').optional().or(z.literal('')),
  imageFileIds: z.array(z.string().trim().min(1)).max(12, 'You can upload up to 12 images.').default([]),
})

export const listingFormSchema = listingFormBaseSchema.superRefine((values, context) => {
  if (values.propertyType !== 'land') {
    return
  }

  if (!String(values.region || '').trim()) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Region is required for land listings.',
      path: ['region'],
    })
  }

  if (!String(values.district || '').trim()) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'District is required for land listings.',
      path: ['district'],
    })
  }

  if (!String(values.landTenureType || '').trim()) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Land tenure system is required for land listings.',
      path: ['landTenureType'],
    })
  }
})

export const listingStepConfig = [
  {
    id: 'basics',
    title: 'Basics',
    description: 'Core rental and property details.',
    fields: ['title', 'description', 'listingIntent', 'propertyType', 'rentAmount', 'currency', 'paymentFrequency', 'bedrooms', 'bathrooms'],
  },
  {
    id: 'location',
    title: 'Location',
    description: 'Where the property is located.',
    fields: ['address', 'neighborhood', 'city', 'country', 'region', 'district', 'landTenureType', 'latitude', 'longitude', 'availableFrom'],
  },
  {
    id: 'details',
    title: 'Details',
    description: 'Amenities and image references.',
    fields: ['amenitiesText', 'imageFileIds'],
  },
]

export const listingFormDefaultValues = {
  title: '',
  description: '',
  listingIntent: 'rent',
  propertyType: 'apartment',
  rentAmount: 0,
  currency: 'UGX',
  paymentFrequency: 'monthly',
  bedrooms: 1,
  bathrooms: 1,
  address: '',
  neighborhood: '',
  city: '',
  country: 'UG',
  region: '',
  district: '',
  landTenureType: '',
  latitude: 0.3476,
  longitude: 32.5825,
  availableFrom: '',
  amenitiesText: '',
  imageFileIds: [],
}

function toDateTimeLocal(value) {
  if (!value) {
    return ''
  }

  const parsedDate = new Date(value)
  if (Number.isNaN(parsedDate.getTime())) {
    return ''
  }

  const timezoneOffset = parsedDate.getTimezoneOffset() * 60 * 1000
  return new Date(parsedDate.getTime() - timezoneOffset).toISOString().slice(0, 16)
}

export function mapListingDocumentToFormValues(listingDocument) {
  return {
    title: listingDocument.title ?? listingFormDefaultValues.title,
    description: listingDocument.description ?? listingFormDefaultValues.description,
    listingIntent: listingDocument.listingIntent ?? listingFormDefaultValues.listingIntent,
    propertyType: listingDocument.propertyType ?? listingFormDefaultValues.propertyType,
    rentAmount: listingDocument.rentAmount ?? listingFormDefaultValues.rentAmount,
    currency: listingDocument.currency ?? listingFormDefaultValues.currency,
    paymentFrequency: listingDocument.paymentFrequency ?? listingFormDefaultValues.paymentFrequency,
    bedrooms: listingDocument.bedrooms ?? listingFormDefaultValues.bedrooms,
    bathrooms: listingDocument.bathrooms ?? listingFormDefaultValues.bathrooms,
    address: listingDocument.address ?? listingFormDefaultValues.address,
    neighborhood: listingDocument.neighborhood ?? listingFormDefaultValues.neighborhood,
    city: listingDocument.city ?? listingFormDefaultValues.city,
    country: listingDocument.country ?? listingFormDefaultValues.country,
    region: listingDocument.region ?? listingFormDefaultValues.region,
    district: listingDocument.district ?? listingFormDefaultValues.district,
    landTenureType: listingDocument.landTenureType ?? listingFormDefaultValues.landTenureType,
    latitude: listingDocument.latitude ?? listingFormDefaultValues.latitude,
    longitude: listingDocument.longitude ?? listingFormDefaultValues.longitude,
    availableFrom: toDateTimeLocal(listingDocument.availableFrom),
    amenitiesText: Array.isArray(listingDocument.amenities) ? listingDocument.amenities.join(', ') : '',
    imageFileIds: Array.isArray(listingDocument.imageFileIds) ? listingDocument.imageFileIds : [],
  }
}
