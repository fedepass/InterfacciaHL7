/**
 * Inferisce la categoria terapeutica del farmaco dal nome e/o dal codice ATC.
 * Priorità: corrispondenza per nome → prefisso ATC → 'OTHER'
 */
export function inferCategory(name: string, code?: string): string {
  const n = (name || '').toLowerCase();

  if (/methotrex|cisplat|carboplat|cyclophos|doxorub|fluorourac|vincrist|paclitax|gemcitab|irinotecan|oxaliplat|etoposid|bleomycin|dacarbaz|ifosfam/.test(n)) return 'CHEMOTHERAPY';
  if (/cyclosporin|ciclosporin|tacrolimus|mycophenolat|micofenolat|azathioprin|sirolimus|everolimus/.test(n)) return 'IMMUNOSUPPRESSANT';
  if (/amoxicil|ampicil|cefazolin|ceftriaxon|vancomycin|vancomicin|meropenem|piperacillin|metronidazol|ciprofloxacin|levofloxacin|imipenem|linezolid|daptomycin/.test(n)) return 'ANTIBIOTIC';
  if (/heparin|eparina|warfarin|enoxaparin|fondaparin|dabigatran|rivaroxaban/.test(n)) return 'ANTICOAGULANT';
  if (/glucose|glucosio|dextrose|amino.*acid|aminoacid|lipid|lipide|tpn|parenteral|nutriflex|kabiven/.test(n)) return 'NUTRITION';
  if (/morphine|morfina|fentanyl|oxycodone|ossicodone|tramadol|hydromorphone|remifentanil|sufentanil/.test(n)) return 'ANALGESIC_OPIOID';
  if (/insulin|insulina/.test(n)) return 'INSULIN';

  if (code) {
    if (code.startsWith('L01')) return 'CHEMOTHERAPY';
    if (code.startsWith('L04')) return 'IMMUNOSUPPRESSANT';
    if (code.startsWith('J01')) return 'ANTIBIOTIC';
    if (code.startsWith('B01')) return 'ANTICOAGULANT';
    if (code.startsWith('B05') || code.startsWith('V06')) return 'NUTRITION';
    if (code.startsWith('N02A')) return 'ANALGESIC_OPIOID';
    if (code.startsWith('A10A')) return 'INSULIN';
  }

  return 'OTHER';
}
