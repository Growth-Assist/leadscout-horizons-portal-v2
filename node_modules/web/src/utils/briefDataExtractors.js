/**
 * Safely extracts the ecommerce signal audit data from a brief object.
 * 
 * Checks multiple possible paths in order using optional chaining and returns
 * the first non-null/non-undefined value found. If none of the paths resolve
 * to a value, returns null.
 * 
 * @param {Object} briefOrParsedData - The brief object or parsed data object to extract from.
 *                                     Can be null, undefined, or any object shape.
 * @returns {*} The ecommerce signal audit data if found, or null if not found or input is invalid.
 * 
 * @example
 * // With parsedResearchData path
 * const audit = getEcommerceSignalAudit({
 *   parsedResearchData: {
 *     ecommerce_signal_audit: { platforms: ['Shopify', 'WooCommerce'] }
 *   }
 * });
 * // Returns: { platforms: ['Shopify', 'WooCommerce'] }
 * 
 * @example
 * // With final_brief_json.research_appendix path
 * const audit = getEcommerceSignalAudit({
 *   final_brief_json: {
 *     research_appendix: {
 *       ecommerce_signal_audit: { conversion_rate: 2.5 }
 *     }
 *   }
 * });
 * // Returns: { conversion_rate: 2.5 }
 * 
 * @example
 * // With no matching paths
 * const audit = getEcommerceSignalAudit({ someOtherField: 'value' });
 * // Returns: null
 * 
 * @example
 * // With null or undefined input
 * const audit = getEcommerceSignalAudit(null);
 * // Returns: null
 */
export function getEcommerceSignalAudit(briefOrParsedData) {
  // Check path 1: parsedResearchData.ecommerce_signal_audit
  const path1 = briefOrParsedData?.parsedResearchData?.ecommerce_signal_audit;
  if (path1 !== null && path1 !== undefined) {
    return path1;
  }

  // Check path 2: final_brief_json.research_appendix.ecommerce_signal_audit
  const path2 = briefOrParsedData?.final_brief_json?.research_appendix?.ecommerce_signal_audit;
  if (path2 !== null && path2 !== undefined) {
    return path2;
  }

  // Check path 3: final_brief_json.ecommerce_signal_audit
  const path3 = briefOrParsedData?.final_brief_json?.ecommerce_signal_audit;
  if (path3 !== null && path3 !== undefined) {
    return path3;
  }

  // Check path 4: parsedBrief.research_appendix.ecommerce_signal_audit
  const path4 = briefOrParsedData?.parsedBrief?.research_appendix?.ecommerce_signal_audit;
  if (path4 !== null && path4 !== undefined) {
    return path4;
  }

  // Check path 5: parsedBrief.ecommerce_signal_audit
  const path5 = briefOrParsedData?.parsedBrief?.ecommerce_signal_audit;
  if (path5 !== null && path5 !== undefined) {
    return path5;
  }

  // No matching path found
  return null;
}