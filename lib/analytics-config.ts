const measurementIdPattern = /^G-[A-Z0-9]+$/;
const tagManagerIdPattern = /^GTM-[A-Z0-9]+$/;

export const defaultGaMeasurementId = 'G-54HQP6KBLV';

export function tagManagerId(value: string | undefined) {
  const id = value?.trim() ?? '';
  return tagManagerIdPattern.test(id) ? id : '';
}

export function gaMeasurementId(value: string | undefined) {
  const id = value?.trim() ?? '';
  return measurementIdPattern.test(id) ? id : defaultGaMeasurementId;
}
