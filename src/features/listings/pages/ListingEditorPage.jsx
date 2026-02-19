import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { Badge, Button, Card, CardBody, CardHeader, CardTitle, FormField, Input, Spinner, getFieldInputClassName } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'
import { ListingMediaManager } from '@/features/listings/components/ListingMediaManager'
import { listingsService } from '@/features/listings/services/listingsService'
import {
  listingFormDefaultValues,
  listingFormSchema,
  listingStepConfig,
  mapListingDocumentToFormValues,
  paymentFrequencyOptions,
  propertyTypeOptions,
} from '@/features/listings/utils/listingForm'

function StepBadge({ index, active, complete }) {
  if (complete) {
    return <Badge variant="success">{index + 1}</Badge>
  }

  if (active) {
    return <Badge variant="info">{index + 1}</Badge>
  }

  return <Badge>{index + 1}</Badge>
}

export function ListingEditorPage() {
  const navigate = useNavigate()
  const { listingId } = useParams()
  const isEditMode = Boolean(listingId)
  const { user } = useAuth()

  const [stepIndex, setStepIndex] = useState(0)
  const [loadingListing, setLoadingListing] = useState(isEditMode)
  const [activeSubmitIntent, setActiveSubmitIntent] = useState('draft')
  const [currentStatus, setCurrentStatus] = useState('draft')

  const {
    register,
    handleSubmit,
    trigger,
    reset,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(listingFormSchema),
    defaultValues: listingFormDefaultValues,
  })

  const imageFileIds = useWatch({
    control,
    name: 'imageFileIds',
  })

  useEffect(() => {
    if (!isEditMode || !listingId || !user?.$id) {
      return
    }

    let active = true

    const loadListing = async () => {
      setLoadingListing(true)

      try {
        const listing = await listingsService.getListingById({ listingId })

        if (!active) {
          return
        }

        if (listing.landlordId !== user.$id) {
          toast.error('You are not allowed to edit this listing.')
          navigate('/dashboard/landlord/listings', { replace: true })
          return
        }

        reset(mapListingDocumentToFormValues(listing))
        setCurrentStatus(listing.status || 'draft')
      } catch (error) {
        toast.error(error?.message || 'Unable to load listing for editing.')
        navigate('/dashboard/landlord/listings', { replace: true })
      } finally {
        if (active) {
          setLoadingListing(false)
        }
      }
    }

    loadListing()

    return () => {
      active = false
    }
  }, [isEditMode, listingId, navigate, reset, user?.$id])

  const currentStep = listingStepConfig[stepIndex]
  const isFirstStep = stepIndex === 0
  const isLastStep = stepIndex === listingStepConfig.length - 1
  const isDraftAction = activeSubmitIntent === 'draft'

  const pageTitle = isEditMode ? 'Edit Listing' : 'Create Listing'
  const pageSubtitle = isEditMode
    ? 'Update details, save changes as draft, or publish updates.'
    : 'Use the multi-step flow to create a listing and publish when ready.'

  const goToNextStep = async () => {
    const isValid = await trigger(currentStep.fields, { shouldFocus: true })

    if (!isValid) {
      return
    }

    setStepIndex((value) => Math.min(value + 1, listingStepConfig.length - 1))
  }

  const goToPreviousStep = () => {
    setStepIndex((value) => Math.max(value - 1, 0))
  }

  const submitWithIntent = (intent) => {
    setActiveSubmitIntent(intent)
    handleSubmit((values) => onSubmit(values, intent))()
  }

  const onSubmit = async (values, intent = activeSubmitIntent) => {
    if (!user?.$id) {
      toast.error('You must be logged in as a landlord to save a listing.')
      return
    }

    const status = intent === 'publish' ? 'available' : 'draft'

    try {
      if (isEditMode && listingId) {
        await listingsService.updateListing({
          listingId,
          landlordId: user.$id,
          values,
          status,
        })
      } else {
        await listingsService.createListing({
          landlordId: user.$id,
          values,
          status,
        })
      }

      setCurrentStatus(status)
      toast.success(status === 'available' ? 'Listing published successfully.' : 'Draft saved successfully.')
      navigate('/dashboard/landlord/listings', { replace: true })
    } catch (error) {
      toast.error(error?.message || 'Unable to save listing.')
    }
  }

  let stepContent

  if (currentStep.id === 'basics') {
    stepContent = (
      <div className="grid gap-4 md:grid-cols-2">
        <Input className="md:col-span-2" error={errors.title?.message} label="Listing title" required {...register('title')} />
        <FormField error={errors.description?.message} id="description" label="Description" required>
          <textarea className={getFieldInputClassName({ hasError: Boolean(errors.description), className: 'min-h-32' })} id="description" {...register('description')} />
        </FormField>

        <FormField error={errors.propertyType?.message} id="propertyType" label="Property type" required>
          <select className={getFieldInputClassName({ hasError: Boolean(errors.propertyType) })} id="propertyType" {...register('propertyType')}>
            {propertyTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FormField>

        <Input error={errors.rentAmount?.message} label="Rent amount" required type="number" {...register('rentAmount')} />
        <Input error={errors.currency?.message} label="Currency (ISO code)" required maxLength={3} {...register('currency')} />

        <FormField error={errors.paymentFrequency?.message} id="paymentFrequency" label="Payment frequency" required>
          <select className={getFieldInputClassName({ hasError: Boolean(errors.paymentFrequency) })} id="paymentFrequency" {...register('paymentFrequency')}>
            {paymentFrequencyOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FormField>

        <Input error={errors.bedrooms?.message} label="Bedrooms" required type="number" {...register('bedrooms')} />
        <Input error={errors.bathrooms?.message} label="Bathrooms" required type="number" {...register('bathrooms')} />
      </div>
    )
  } else if (currentStep.id === 'location') {
    stepContent = (
      <div className="grid gap-4 md:grid-cols-2">
        <Input className="md:col-span-2" error={errors.address?.message} label="Address" required {...register('address')} />
        <Input error={errors.neighborhood?.message} label="Neighborhood" {...register('neighborhood')} />
        <Input error={errors.city?.message} label="City" required {...register('city')} />
        <Input error={errors.country?.message} label="Country code" required maxLength={2} {...register('country')} />
        <Input error={errors.latitude?.message} label="Latitude" required step="0.000001" type="number" {...register('latitude')} />
        <Input error={errors.longitude?.message} label="Longitude" required step="0.000001" type="number" {...register('longitude')} />
        <Input className="md:col-span-2" error={errors.availableFrom?.message} hint="Optional. Leave blank if the property is immediately available." label="Available from" type="datetime-local" {...register('availableFrom')} />
      </div>
    )
  } else {
    stepContent = (
      <div className="grid gap-4">
        <Input
          error={errors.amenitiesText?.message}
          hint="Example: WiFi, Parking, Balcony, Security"
          label="Amenities (comma separated)"
          {...register('amenitiesText')}
        />
        <FormField error={errors.imageFileIds?.message} id="imageFileIds" label="Media">
          <ListingMediaManager
            disabled={isSubmitting}
            imageFileIds={Array.isArray(imageFileIds) ? imageFileIds : []}
            onChange={(nextIds) =>
              setValue('imageFileIds', nextIds, {
                shouldDirty: true,
                shouldTouch: true,
                shouldValidate: true,
              })
            }
          />
        </FormField>
      </div>
    )
  }

  if (loadingListing) {
    return (
      <div className="flex min-h-[240px] items-center justify-center rounded-2xl border border-slate-200 bg-white/80">
        <Spinner size="md" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white/80 p-5 shadow-sm shadow-slate-900/5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{pageTitle}</h1>
          <p className="text-sm text-slate-600">{pageSubtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={currentStatus === 'available' ? 'success' : 'neutral'}>
            {currentStatus === 'available' ? 'Published' : 'Draft'}
          </Badge>
          <Link to="/dashboard/landlord/listings">
            <Button size="sm" variant="secondary">
              Back to listings
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Step {stepIndex + 1}</CardTitle>
          <p className="mt-1 text-sm text-slate-600">{currentStep.description}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {listingStepConfig.map((step, index) => (
              <div className="flex items-center gap-2 rounded-lg border border-slate-200/80 bg-slate-50/70 px-2.5 py-1.5" key={step.id}>
                <StepBadge active={index === stepIndex} complete={index < stepIndex} index={index} />
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{step.title}</span>
              </div>
            ))}
          </div>
        </CardHeader>
        <CardBody>
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            {stepContent}

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4">
              <div className="flex gap-2">
                <Button disabled={isFirstStep} onClick={goToPreviousStep} size="sm" type="button" variant="secondary">
                  Previous
                </Button>
                {!isLastStep && (
                  <Button onClick={goToNextStep} size="sm" type="button" variant="ghost">
                    Next step
                  </Button>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  loading={isSubmitting && isDraftAction}
                  loadingText="Saving draft..."
                  onClick={() => submitWithIntent('draft')}
                  size="sm"
                  type="button"
                  variant="secondary"
                >
                  Save draft
                </Button>
                <Button
                  loading={isSubmitting && !isDraftAction}
                  loadingText="Publishing..."
                  onClick={() => submitWithIntent('publish')}
                  size="sm"
                  type="button"
                >
                  Publish
                </Button>
              </div>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  )
}
