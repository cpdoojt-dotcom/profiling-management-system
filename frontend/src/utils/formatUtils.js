/**
 * Formats a person's address into a single comma-separated string.
 * @param {Object} person - The object containing address fields (addressNo, street, purok, barangay, cityMunicipality)
 * @returns {string} - The formatted complete address
 */
export const formatAddress = (person) => {
  if (!person) return '-';
  const { addressNo, street, purok, barangay, cityMunicipality } = person;
  
  // Format: Purok address number street barangay, Municipality/city
  const mainParts = [purok, addressNo, street, barangay]
    .map(part => (part || '').trim())
    .filter(Boolean)
    .join(' ');
    
  const city = (cityMunicipality || '').trim();
  
  if (!mainParts && !city) return '-';
  if (!city) return mainParts;
  if (!mainParts) return city;
  
  return `${mainParts}, ${city}`;
};
