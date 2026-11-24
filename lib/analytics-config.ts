const measurementIdPattern = /^G-[A-Z0-9]+$/;
const tagManagerIdPattern = /^GTM-[A-Z0-9]+$/;
const metaPixelIdPattern = /^\d{15,16}$/;
const metaPixelExcludedPattern = /^\/(admin|api|quote)(\/|$)/;

export const defaultGaMeasurementId = 'G-54HQP6KBLV';
export const defaultMetaPixelId = '1479421600920150';

export function tagManagerId(value: string | undefined) {
  const id = value?.trim() ?? '';
  return tagManagerIdPattern.test(id) ? id : '';
}

export function gaMeasurementId(value: string | undefined) {
  const id = value?.trim() ?? '';
  return measurementIdPattern.test(id) ? id : defaultGaMeasurementId;
}

export function metaPixelId(value: string | undefined) {
  const id = value?.trim() ?? '';
  return metaPixelIdPattern.test(id) ? id : defaultMetaPixelId;
}

export function isMetaPixelExcluded(pathname: string) {
  return metaPixelExcludedPattern.test(pathname);
}
