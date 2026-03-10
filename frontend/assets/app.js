// ─── Storico prescrizioni (PENDING, paginate) ─────────────────────────────────

const HISTORY_PAGE_SIZE = 10;
let _historyData = [];
let _historyShown = 0;

function _historyRow(p) {
  const prep = p.preparation;
  const dosaggio = prep.dosage ?? '—';
  const parti = [];
  if (prep.solvent) parti.push(prep.solvent);
  if (prep.volume)  parti.push(prep.volume);
  const contenitore = parti.length ? parti.join(' ') : '—';
  const conc = prep.finalConcentration
    ? `<div style="font-size:.72rem;color:#718096">${prep.finalConcentration}</div>`
    : '';
  return `
  <tr>
    <td style="font-family:monospace;font-size:.75rem">${p.prescriptionId.substring(0,8)}…</td>
    <td><span class="priority ${p.priority}">${p.priority}</span></td>
    <td>${p.patient.name}</td>
    <td>${p.patient.ward}</td>
    <td>${prep.drug}</td>
    <td>${dosaggio}</td>
    <td>${contenitore}${conc}</td>
    <td>${fmtDate(p.timestamps.received)}</td>
  </tr>`;
}

function _renderHistoryPage() {
  const tbody = document.getElementById('history-body');
  if (!tbody) return;
  const slice = _historyData.slice(0, _historyShown);
  tbody.innerHTML = slice.map(_historyRow).join('');

  const countEl = document.getElementById('history-count');
  if (countEl) countEl.textContent = `(${_historyData.length})`;

  const pagDiv  = document.getElementById('history-pagination');
  const pagInfo = document.getElementById('history-pag-info');
  const loadBtn = document.getElementById('history-load-more');
  const remaining = _historyData.length - _historyShown;

  if (_historyData.length > HISTORY_PAGE_SIZE) {
    pagDiv.style.display = 'flex';
    pagInfo.textContent = `Mostrate ${_historyShown} di ${_historyData.length}`;
    if (remaining > 0) {
      loadBtn.style.display = '';
      loadBtn.textContent = `Carica altre ${Math.min(remaining, HISTORY_PAGE_SIZE)}`;
    } else {
      loadBtn.style.display = 'none';
    }
  } else {
    pagDiv.style.display = 'none';
  }
}

async function loadHistory() {
  const tbody = document.getElementById('history-body');
  if (!tbody) return;
  const data = await apiFetch('/api/prescriptions?status=PENDING&raw=true');
  _historyData = data ?? [];
  _historyShown = Math.min(HISTORY_PAGE_SIZE, _historyData.length);

  if (_historyData.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" class="empty">Nessuna prescrizione in attesa</td></tr>';
    const countEl = document.getElementById('history-count');
    if (countEl) countEl.textContent = '(0)';
    const pagDiv = document.getElementById('history-pagination');
    if (pagDiv) pagDiv.style.display = 'none';
    return;
  }
  _renderHistoryPage();
}

function loadMoreHistory() {
  _historyShown = Math.min(_historyShown + HISTORY_PAGE_SIZE, _historyData.length);
  _renderHistoryPage();
}

// ─── Generatore prescrizioni di test casuali ─────────────────────────────────

const _RND = {
  firstName: ['Mario','Giulia','Luca','Anna','Roberto','Francesca','Pietro','Elena','Marco','Sofia','Alessandro','Laura','Matteo','Chiara','Davide','Sara','Gianni','Paola','Antonio','Monica'],
  lastName:  ['Rossi','Ferrari','Esposito','Bianchi','Romano','Colombo','Ricci','Marino','Greco','Bruno','Gallo','Conti','De Luca','Mancini','Costa','Giordano','Rizzo','Lombardi','Moretti','Barbieri'],
  ward:      ['ONCOLOGIA','CARDIOLOGIA','TERAPIA INTENSIVA','PNEUMOLOGIA','MEDICINA INTERNA','CHIRURGIA','NEUROLOGIA','NEFROLOGIA','EMATOLOGIA','INFETTIVOLOGIA'],
  solvent:   ['NaCl 0.9%','Glucosio 5%','Ringer lattato'],
  volume:    [100, 250, 250, 500],
  rate:      [50, 60, 80, 100, 125, 250],
  freq:      ['Once','QD','BID','TID','Q6H','Q8H','Q12H'],
  priority:  ['ROUTINE','ROUTINE','ROUTINE','URGENT','STAT'],
  docFirst:  ['Antonio','Giovanna','Roberto','Maria','Paolo','Cristina','Francesco','Valentina'],
  docLast:   ['Bianchi','Ferrari','Romano','Conti','Esposito','Mancini','De Santis','Greco'],
  drug: [
    { name:'Methotrexate',     code:'L01BA01', doses:[[25,'mg'],[50,'mg'],[75,'mg'],[100,'mg']] },
    { name:'Cisplatino',       code:'L01XA01', doses:[[50,'mg'],[75,'mg'],[100,'mg']] },
    { name:'Paclitaxel',       code:'L01CD01', doses:[[135,'mg'],[175,'mg'],[200,'mg']] },
    { name:'Carboplatino',     code:'L01XA02', doses:[[300,'mg'],[400,'mg'],[600,'mg']] },
    { name:'Oxaliplatino',     code:'L01XA03', doses:[[85,'mg'],[130,'mg']] },
    { name:'Doxorubicina',     code:'L01DB01', doses:[[40,'mg'],[60,'mg'],[75,'mg']] },
    { name:'Vancomicina',      code:'J01XA01', doses:[[500,'mg'],[1000,'mg'],[1500,'mg']] },
    { name:'Meropenem',        code:'J01DH02', doses:[[500,'mg'],[1000,'mg'],[2000,'mg']] },
    { name:'Pip./Tazobactam',  code:'J01CR05', doses:[[4500,'mg']] },
    { name:'Ceftriaxone',      code:'J01DD04', doses:[[1000,'mg'],[2000,'mg']] },
    { name:'Levofloxacina',    code:'J01MA12', doses:[[500,'mg'],[750,'mg']] },
    { name:'Eparina',          code:'B01AB01', doses:[[25000,'UI'],[50000,'UI']] },
    { name:'Ciclosporina',     code:'L04AD01', doses:[[100,'mg'],[200,'mg'],[300,'mg']] },
    { name:'Tacrolimus',       code:'L04AD02', doses:[[5,'mg'],[10,'mg']] },
    { name:'Morfina Solfato',  code:'N02AA01', doses:[[10,'mg'],[20,'mg'],[30,'mg']] },
    { name:'Insulina Umana',   code:'A10AB01', doses:[[100,'UI'],[200,'UI'],[500,'UI']] },
  ],
};

function _pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function _ri(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function _p2(n) { return String(n).padStart(2, '0'); }
function _hl7Now() {
  const d = new Date();
  return `${d.getFullYear()}${_p2(d.getMonth()+1)}${_p2(d.getDate())}${_p2(d.getHours())}${_p2(d.getMinutes())}${_p2(d.getSeconds())}`;
}
function _uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}
function _hl7Prio(p)  { return p === 'STAT' ? 'S' : p === 'URGENT' ? 'A' : 'R'; }
function _fhirPrio(p) { return p === 'STAT' ? 'stat' : p === 'URGENT' ? 'urgent' : 'routine'; }
function _xmlEsc(s)   { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function _buildRndData() {
  const drug = _pick(_RND.drug);
  const [doseVal, doseUnit] = _pick(drug.doses);
  return {
    pat: {
      fn: _pick(_RND.firstName), ln: _pick(_RND.lastName),
      id: 'P' + _ri(100000, 999999),
      ward: _pick(_RND.ward), bed: _ri(1, 30),
      dob: `${_ri(1940,1995)}${_p2(_ri(1,12))}${_p2(_ri(1,28))}`,
      sex: Math.random() > .5 ? 'M' : 'F',
    },
    drug: { name: drug.name, code: drug.code, doseVal, doseUnit, solvent: _pick(_RND.solvent), volume: _pick(_RND.volume), rate: _pick(_RND.rate), freq: _pick(_RND.freq) },
    prio: _pick(_RND.priority),
    docFn: _pick(_RND.docFirst), docLn: _pick(_RND.docLast),
  };
}

function _genHL7v2({ pat, drug, prio, docFn, docLn }) {
  const now = _hl7Now(), hp = _hl7Prio(prio);
  // RXE fields: f1=timing, f2=code^name, f3=dose, f4=(empty), f5=unit, f6=form,
  //             f7-f22=(16 empty fields), f23=rate value, f24=rate unit  (HL7 v2.5 standard)
  const rxe = `RXE|^${drug.freq}|${drug.code}^${drug.name}^L|${drug.doseVal}||${drug.doseUnit}|IV${'|'.repeat(16)}|${drug.rate}|ml/h`;
  return [
    `MSH|^~\\&|HIS|OSPACC|FARMACIA|OSP|${now}||ORM^O01|MSG${_ri(100000,999999)}|P|2.5`,
    `PID|1||${pat.id}^^^OSP^MR||${pat.ln}^${pat.fn}||${pat.dob}|${pat.sex}`,
    `PV1|1|I|${pat.ward}^${_p2(pat.bed)}^A||||DOC${_ri(1,99)}^${docLn}^${docFn}`,
    `ORC|NW|ORD${_ri(100000,999999)}|||||^^^${now}^^${hp}`,
    rxe,
    `RXR|IV^Intravenosa`,
    `RXC|B|SOL^${drug.solvent}^L|${drug.volume}|ml`,
    `RXC|A|${drug.code}^${drug.name}^L|${drug.doseVal}|${drug.doseUnit}`,
    `TQ1|1|||${drug.freq}|||||${hp}`,
    `NTE|||${drug.name} ${drug.doseVal} ${drug.doseUnit} in ${drug.solvent} ${drug.volume}ml`,
  ].join('\r');
}

function _genFHIRJson({ pat, drug, prio, docFn, docLn }) {
  return JSON.stringify({
    resourceType: 'MedicationRequest',
    id: _uuid(),
    status: 'active', intent: 'order',
    priority: _fhirPrio(prio),
    authoredOn: new Date().toISOString(),
    subject: { reference: `Patient/${pat.id}`, display: `${pat.fn} ${pat.ln}` },
    encounter: { display: pat.ward },
    requester: { display: `Dr. ${docFn} ${docLn}` },
    medicationCodeableConcept: {
      text: drug.name,
      coding: [{ code: drug.code, display: drug.name, system: 'http://www.whocc.no/atc' }],
    },
    dosageInstruction: [{
      route: { coding: [{ code: '47625008', display: 'Intravenous', system: 'http://snomed.info/sct' }] },
      timing: { code: { text: drug.freq } },
      doseAndRate: [{ doseQuantity: { value: drug.doseVal, unit: drug.doseUnit } }],
      rateQuantity: { value: drug.rate, unit: 'ml/h' },
    }],
    extension: [
      { url: 'solvent', valueString: drug.solvent },
      { url: 'volume',  valueString: `${drug.volume}ml` },
      { url: 'ward',    valueString: pat.ward },
    ],
  }, null, 2);
}

function _genFHIRXml({ pat, drug, prio, docFn, docLn }) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<MedicationRequest xmlns="http://hl7.org/fhir">
  <id value="${_uuid()}"/>
  <status value="active"/>
  <intent value="order"/>
  <priority value="${_fhirPrio(prio)}"/>
  <authoredOn value="${new Date().toISOString()}"/>
  <subject>
    <reference value="Patient/${_xmlEsc(pat.id)}"/>
    <display value="${_xmlEsc(pat.fn)} ${_xmlEsc(pat.ln)}"/>
  </subject>
  <encounter>
    <display value="${_xmlEsc(pat.ward)}"/>
  </encounter>
  <requester>
    <display value="Dr. ${_xmlEsc(docFn)} ${_xmlEsc(docLn)}"/>
  </requester>
  <medicationCodeableConcept>
    <text value="${_xmlEsc(drug.name)}"/>
    <coding>
      <system value="http://www.whocc.no/atc"/>
      <code value="${_xmlEsc(drug.code)}"/>
      <display value="${_xmlEsc(drug.name)}"/>
    </coding>
  </medicationCodeableConcept>
  <dosageInstruction>
    <route>
      <coding>
        <system value="http://snomed.info/sct"/>
        <code value="47625008"/>
        <display value="Intravenous"/>
      </coding>
    </route>
    <timing>
      <code>
        <text value="${_xmlEsc(drug.freq)}"/>
      </code>
    </timing>
    <doseQuantity>
      <value>${drug.doseVal}</value>
      <unit>${_xmlEsc(drug.doseUnit)}</unit>
    </doseQuantity>
    <rateQuantity>
      <value>${drug.rate}</value>
      <unit>ml/h</unit>
    </rateQuantity>
  </dosageInstruction>
  <extension url="solvent">
    <valueString value="${_xmlEsc(drug.solvent)}"/>
  </extension>
  <extension url="volume">
    <valueString value="${drug.volume}ml"/>
  </extension>
</MedicationRequest>`;
}

function _genCDAPrf({ pat, drug, prio, docFn, docLn }) {
  const now     = _hl7Now();
  const cdaPrio = prio === 'STAT' ? 'S' : prio === 'URGENT' ? 'A' : 'R';
  const tpCode  = prio === 'STAT' ? 'ST' : prio === 'URGENT' ? 'UE' : 'RR';
  const freqMap = { Once:{v:0,u:'h'}, QD:{v:24,u:'h'}, BID:{v:12,u:'h'}, TID:{v:8,u:'h'}, Q6H:{v:6,u:'h'}, Q8H:{v:8,u:'h'}, Q12H:{v:12,u:'h'} };
  const fp = freqMap[drug.freq] || { v:24, u:'h' };
  const freqEl = fp.v > 0
    ? `<effectiveTime operator="A"><period value="${fp.v}" unit="${fp.u}"/></effectiveTime>`
    : `<effectiveTime operator="A"><event code="ONCE" codeSystem="2.16.840.1.113883.5.139"/></effectiveTime>`;
  const fakeAIC = '0' + _ri(10000000, 99999999);
  const nre = 'NRE' + _ri(100000000, 999999999);
  return `<?xml version="1.0" encoding="UTF-8"?>
<ClinicalDocument xmlns="urn:hl7-org:v3">
  <realmCode code="IT"/>
  <typeId root="2.16.840.1.113883.1.3" extension="POCD_MT000040UV02"/>
  <templateId root="2.16.840.1.113883.2.9.10.1.2" extension="2.1"/>
  <id root="2.16.840.1.113883.2.9.4.3.8" extension="${nre}"/>
  <code code="57833-6" codeSystem="2.16.840.1.113883.6.1" displayName="Prescriptions">
    <translation code="PRESC_FARMA" codeSystem="2.16.840.1.113883.2.9.5.2.1">
      <qualifier>
        <name code="TP"/>
        <value code="${tpCode}"/>
      </qualifier>
    </translation>
  </code>
  <effectiveTime value="${now}"/>
  <confidentialityCode code="N" codeSystem="2.16.840.1.113883.5.25"/>
  <languageCode code="it-IT"/>
  <recordTarget>
    <patientRole>
      <id root="2.16.840.1.113883.2.9.4.3.2" extension="${pat.id}"/>
      <patient>
        <name>
          <family>${_xmlEsc(pat.ln)}</family>
          <given>${_xmlEsc(pat.fn)}</given>
        </name>
        <administrativeGenderCode code="${pat.sex}" codeSystem="2.16.840.1.113883.1.11.1"/>
        <birthTime value="${pat.dob}"/>
      </patient>
    </patientRole>
  </recordTarget>
  <author>
    <time value="${now}"/>
    <assignedAuthor>
      <id root="2.16.840.1.113883.2.9.4.3.2" extension="DOC${_ri(10000000,99999999)}"/>
      <code code="MO" codeSystem="2.16.840.1.113883.2.9.5.1.111"/>
      <assignedPerson>
        <name>
          <family>${_xmlEsc(docLn)}</family>
          <given>${_xmlEsc(docFn)}</given>
        </name>
      </assignedPerson>
    </assignedAuthor>
  </author>
  <componentOf>
    <encompassingEncounter>
      <effectiveTime><low value="${now}"/></effectiveTime>
      <location>
        <healthCareFacility>
          <serviceProviderOrganization>
            <name>${_xmlEsc(pat.ward)}</name>
          </serviceProviderOrganization>
        </healthCareFacility>
      </location>
    </encompassingEncounter>
  </componentOf>
  <component>
    <structuredBody>
      <component>
        <section>
          <code code="57828-6" codeSystem="2.16.840.1.113883.6.1" displayName="Prescrizioni"/>
          <title>Prescrizioni</title>
          <text>${_xmlEsc(drug.name)} ${drug.doseVal} ${drug.doseUnit} in ${_xmlEsc(drug.solvent)} ${drug.volume}ml</text>
          <entry>
            <substanceAdministration classCode="SBADM" moodCode="RQO">
              <priorityCode code="${cdaPrio}" codeSystem="2.16.840.1.113883.5.7"/>
              ${freqEl}
              <routeCode code="47625008" codeSystem="2.16.840.1.113883.6.96" displayName="Intravenoso"/>
              <doseQuantity value="${drug.doseVal}" unit="${drug.doseUnit}"/>
              <consumable>
                <manufacturedProduct>
                  <manufacturedLabeledDrug>
                    <code code="${fakeAIC}" codeSystem="2.16.840.1.113883.2.9.6.1.5"
                          displayName="${_xmlEsc(drug.name.toUpperCase())} ${drug.doseVal}${drug.doseUnit}">
                      <translation code="${drug.code}" codeSystem="2.16.840.1.113883.6.73"
                                   displayName="${_xmlEsc(drug.name)}"/>
                    </code>
                    <name>${_xmlEsc(drug.name)}</name>
                  </manufacturedLabeledDrug>
                </manufacturedProduct>
              </consumable>
              <entryRelationship typeCode="SUBJ" inversionInd="true">
                <act classCode="ACT" moodCode="EVN">
                  <code code="48767-8" codeSystem="2.16.840.1.113883.6.1"/>
                  <text>Diluire in ${drug.volume}ml ${_xmlEsc(drug.solvent)}. Infondere a ${drug.rate}ml/h.</text>
                </act>
              </entryRelationship>
            </substanceAdministration>
          </entry>
        </section>
      </component>
    </structuredBody>
  </component>
</ClinicalDocument>`;
}

function generateRandomTest() {
  const fmt = document.getElementById('test-format')?.value;
  const ta  = document.getElementById('test-payload');
  if (!ta || !fmt) return;
  const data = _buildRndData();
  if (fmt === 'hl7v2')          ta.value = _genHL7v2(data);
  else if (fmt === 'fhir_json') ta.value = _genFHIRJson(data);
  else if (fmt === 'fhir_xml')  ta.value = _genFHIRXml(data);
  else if (fmt === 'cda_prf')   ta.value = _genCDAPrf(data);
}

// ─── Payload di test ─────────────────────────────────────────────────────────

const SAMPLES = {
  hl7v2: `MSH|^~\\&|HIS|OSPACC|FARMACIA|OSP|20240315143000||ORM^O01|MSG001|P|2.5
PID|1||123456^^^OSP^MR||Rossi^Mario||19650520|M|||Via Roma 1^^Milano^^20100^IT
PV1|1|I|ONCOLOGIA^12^A||||DOC001^Bianchi^Luigi
ORC|NW|ORD001|||||^^^20240315150000^^S
RXO|Methotrexate^Methotrexate^L|50|mg|NaCl 0.9%|250ml||
RXR|IV^Intravenosa
NTE|||Preparazione IV urgente - flacone 250ml NaCl 0.9%`,

  fhir_json: JSON.stringify({
    resourceType: 'MedicationRequest',
    priority: 'stat',
    authoredOn: new Date().toISOString(),
    subject: { reference: 'Patient/P789', display: 'Verdi Giuseppe' },
    encounter: { display: 'ONCOLOGIA' },
    requester: { display: 'Dr. Ferrari Antonio' },
    medicationCodeableConcept: {
      text: 'Cisplatino',
      coding: [{ code: 'L01XA01', display: 'Cisplatin', system: 'http://www.whocc.no/atc' }]
    },
    dosageInstruction: [{
      route: { coding: [{ code: '47625008', display: 'Intravenous' }] },
      timing: { code: { text: 'Once' } },
      doseAndRate: [{ doseQuantity: { value: 75, unit: 'mg' } }],
      rateQuantity: { value: 100, unit: 'ml/h' }
    }],
    extension: [
      { url: 'solvent', valueString: 'NaCl 0.9%' },
      { url: 'volume', valueString: '500ml' },
      { url: 'ward', valueString: 'ONCOLOGIA' }
    ]
  }, null, 2),

  cda_prf: `<?xml version="1.0" encoding="UTF-8"?>
<ClinicalDocument xmlns="urn:hl7-org:v3">
  <realmCode code="IT"/>
  <typeId root="2.16.840.1.113883.1.3" extension="POCD_MT000040UV02"/>
  <templateId root="2.16.840.1.113883.2.9.10.1.2" extension="2.1"/>
  <id root="2.16.840.1.113883.2.9.4.3.8" extension="NRE20240315001"/>
  <code code="57833-6" codeSystem="2.16.840.1.113883.6.1" displayName="Prescriptions">
    <translation code="PRESC_FARMA" codeSystem="2.16.840.1.113883.2.9.5.2.1">
      <qualifier>
        <name code="TP"/>
        <value code="RR"/>
      </qualifier>
    </translation>
  </code>
  <effectiveTime value="20240315143000"/>
  <confidentialityCode code="N" codeSystem="2.16.840.1.113883.5.25"/>
  <languageCode code="it-IT"/>
  <recordTarget>
    <patientRole>
      <id root="2.16.840.1.113883.2.9.4.3.2" extension="RSSMRA65A01H703I"/>
      <patient>
        <name>
          <family>Rossi</family>
          <given>Mario</given>
        </name>
        <administrativeGenderCode code="M" codeSystem="2.16.840.1.113883.1.11.1"/>
        <birthTime value="19650101"/>
      </patient>
    </patientRole>
  </recordTarget>
  <author>
    <time value="20240315143000"/>
    <assignedAuthor>
      <id root="2.16.840.1.113883.2.9.4.3.2" extension="BNCLGU55C10D969Y"/>
      <code code="MO" codeSystem="2.16.840.1.113883.2.9.5.1.111"/>
      <assignedPerson>
        <name>
          <family>Bianchi</family>
          <given>Luigi</given>
        </name>
      </assignedPerson>
    </assignedAuthor>
  </author>
  <componentOf>
    <encompassingEncounter>
      <effectiveTime><low value="20240310"/></effectiveTime>
      <location>
        <healthCareFacility>
          <serviceProviderOrganization>
            <name>ONCOLOGIA</name>
          </serviceProviderOrganization>
        </healthCareFacility>
      </location>
    </encompassingEncounter>
  </componentOf>
  <component>
    <structuredBody>
      <component>
        <section>
          <code code="57828-6" codeSystem="2.16.840.1.113883.6.1" displayName="Prescrizioni"/>
          <title>Prescrizioni</title>
          <text>Methotrexate 75mg in NaCl 0.9% 250ml</text>
          <entry>
            <substanceAdministration classCode="SBADM" moodCode="RQO">
              <priorityCode code="S" codeSystem="2.16.840.1.113883.5.7"/>
              <effectiveTime operator="A"><period value="24" unit="h"/></effectiveTime>
              <routeCode code="47625008" codeSystem="2.16.840.1.113883.6.96" displayName="Intravenoso"/>
              <doseQuantity value="75" unit="mg"/>
              <consumable>
                <manufacturedProduct>
                  <manufacturedLabeledDrug>
                    <code code="034759016" codeSystem="2.16.840.1.113883.2.9.6.1.5"
                          displayName="METHOTREXATE EG 50MG/2ML SOL.INI.">
                      <translation code="L01BA01" codeSystem="2.16.840.1.113883.6.73"
                                   displayName="Methotrexate"/>
                    </code>
                    <name>Methotrexate</name>
                  </manufacturedLabeledDrug>
                </manufacturedProduct>
              </consumable>
              <entryRelationship typeCode="SUBJ" inversionInd="true">
                <act classCode="ACT" moodCode="EVN">
                  <code code="48767-8" codeSystem="2.16.840.1.113883.6.1"/>
                  <text>Diluire in 250ml NaCl 0.9%. Infondere a 100ml/h.</text>
                </act>
              </entryRelationship>
            </substanceAdministration>
          </entry>
        </section>
      </component>
    </structuredBody>
  </component>
</ClinicalDocument>`,

  fhir_xml: `<?xml version="1.0" encoding="UTF-8"?>
<MedicationRequest xmlns="http://hl7.org/fhir">
  <priority value="urgent"/>
  <authoredOn value="${new Date().toISOString()}"/>
  <subject>
    <reference value="Patient/P321"/>
    <display value="Esposito Maria"/>
  </subject>
  <encounter>
    <display value="TERAPIA INTENSIVA"/>
  </encounter>
  <requester>
    <display value="Dr. Romano Paolo"/>
  </requester>
  <medicationCodeableConcept>
    <text value="Vancomicina"/>
    <coding>
      <code value="J01XA01"/>
      <display value="Vancomycin"/>
    </coding>
  </medicationCodeableConcept>
  <dosageInstruction>
    <route>
      <text value="IV"/>
      <coding>
        <code value="47625008"/>
        <display value="Intravenous"/>
      </coding>
    </route>
    <timing>
      <code>
        <text value="Q8H"/>
      </code>
    </timing>
    <doseQuantity>
      <value>1000</value>
      <unit>mg</unit>
    </doseQuantity>
    <rateQuantity>
      <value>60</value>
      <unit>ml/h</unit>
    </rateQuantity>
  </dosageInstruction>
  <extension url="solvent">
    <valueString value="NaCl 0.9%"/>
  </extension>
  <extension url="volume">
    <valueString value="250ml"/>
  </extension>
</MedicationRequest>`
};

function loadSample() {
  const fmt = document.getElementById('test-format')?.value;
  if (!fmt) return;
  const ta = document.getElementById('test-payload');
  if (ta) ta.value = SAMPLES[fmt] ?? '';
}

async function sendTest() {
  const fmt = document.getElementById('test-format').value;
  const payload = document.getElementById('test-payload').value;
  const resultEl = document.getElementById('test-result');
  const ctMap = { hl7v2: 'text/plain', fhir_json: 'application/json', fhir_xml: 'application/xml', cda_prf: 'application/xml' };
  try {
    const res = await fetch('/api/prescriptions', {
      method: 'POST',
      headers: { 'Content-Type': ctMap[fmt] },
      body: payload,
    });
    const text = await res.text();
    if (res.ok) {
      resultEl.textContent = `Prescrizione inviata (HTTP ${res.status})`;
      loadHistory();
    } else {
      const data = text ? JSON.parse(text) : {};
      resultEl.textContent = `Errore ${res.status}: ${data.error ?? text}`;
    }
  } catch (e) {
    resultEl.textContent = 'Errore: ' + e.message;
  }
}

// ─── Output Fields Configuration ─────────────────────────────────────────────

// Catalogo campi caricato dal DB via API (popolato da loadOutputPage)
let OUTPUT_FIELD_DEFS = [];

const _GROUP_ICONS = {
  'Generale': '📋',
  'Paziente': '👤',
  'Preparazione Farmaco': '💊',
  'Timestamp': '🕐',
};

const _SAMPLE_OUTPUT = {
  prescriptionId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  status: 'DISPATCHED',
  deliveryStatus: 'SENT',
  priority: 'STAT',
  sourceFormat: 'FHIR_JSON',
  prescribedBy: 'Dott. Bianchi Luigi',
  notes: 'Somministrare lentamente — monitorare reazioni avverse',
  patient: { id: 'P123456', name: 'Rossi Mario', ward: 'ONCOLOGIA', bedNumber: '12A' },
  preparation: {
    drug: 'Methotrexate', category: 'CHEMOTHERAPY', code: 'L01BA01',
    dosage: '75 mg', dosageValue: 75, dosageUnit: 'mg',
    route: 'IV', solvent: 'NaCl 0.9%', volume: '250 ml', volumeValue: 250, volumeUnit: 'ml',
    infusionRate: '100 ml/h', finalConcentration: '0.3 mg/ml', frequency: 'Once',
  },
  timestamps: {
    received: '2026-03-03T14:30:00.000Z',
    dispatched: '2026-03-03T14:30:00.123Z',
    sentToApi: '2026-03-03T14:30:00.456Z',
    requiredBy: '2026-03-03T16:00:00.000Z',
  },
};

function _filterOutputPreview(full, enabledFields) {
  if (!enabledFields || enabledFields.length === 0) return full;
  const enabled = new Set(enabledFields);
  const out = {};
  for (const key of Object.keys(full)) {
    const val = full[key];
    if (val === null || val === undefined) continue;
    if (typeof val === 'object' && !Array.isArray(val)) {
      const nested = {};
      for (const sk of Object.keys(val)) {
        if (enabled.has(`${key}.${sk}`)) nested[sk] = val[sk];
      }
      if (Object.keys(nested).length > 0) out[key] = nested;
    } else {
      if (enabled.has(key)) out[key] = val;
    }
  }
  return out;
}

function _getChecked() {
  return [...document.querySelectorAll('.field-cb:checked')].map(cb => cb.dataset.path);
}

function _updatePreview() {
  const checked = _getChecked();
  const allPaths = OUTPUT_FIELD_DEFS.map(f => f.path);
  const isAll = allPaths.every(p => checked.includes(p));
  const preview = isAll ? _SAMPLE_OUTPUT : _filterOutputPreview(_SAMPLE_OUTPUT, checked);
  document.getElementById('output-preview').textContent = JSON.stringify(preview, null, 2);
  const counter = document.getElementById('field-counter');
  if (counter) counter.textContent = `${checked.length} / ${OUTPUT_FIELD_DEFS.length} campi`;
}

function _syncGroupCheckbox(groupName) {
  const cbs = [...document.querySelectorAll(`.field-cb[data-group="${groupName}"]`)];
  const allOn = cbs.every(cb => cb.checked || cb.disabled);
  const gCb = document.querySelector(`.group-cb[data-group="${groupName}"]`);
  if (gCb) { gCb.checked = allOn; gCb.indeterminate = !allOn && cbs.some(cb => cb.checked); }
}

function toggleGroup(groupName, checked) {
  document.querySelectorAll(`.field-cb[data-group="${groupName}"]`).forEach(cb => {
    if (!cb.disabled) cb.checked = checked;
  });
  _syncGroupCheckbox(groupName);
  _updatePreview();
}

function selectAll() {
  document.querySelectorAll('.field-cb').forEach(cb => { if (!cb.disabled) cb.checked = true; });
  document.querySelectorAll('.group-cb').forEach(cb => { cb.checked = true; cb.indeterminate = false; });
  _updatePreview();
}

function selectNone() {
  document.querySelectorAll('.field-cb').forEach(cb => { if (!cb.disabled) cb.checked = false; });
  document.querySelectorAll('.group-cb').forEach(cb => { cb.checked = false; cb.indeterminate = false; });
  _updatePreview();
}

async function loadOutputPage() {
  const [catalogRaw, cfg] = await Promise.all([
    apiFetch('/api/config/output-fields/catalog'),
    apiFetch('/api/config/output-fields'),
  ]);
  const enabledFields = cfg?.enabledFields ?? null; // null = tutti abilitati

  // Mappa il catalogo DB nel formato usato dalla UI
  OUTPUT_FIELD_DEFS = (catalogRaw ?? []).map(f => ({
    path: f.fieldPath,
    label: f.label,
    group: f.groupName,
    desc: f.description ?? '',
    required: !!f.required,
  }));

  // Raggruppa per group
  const groups = {};
  for (const f of OUTPUT_FIELD_DEFS) {
    if (!groups[f.group]) groups[f.group] = { icon: _GROUP_ICONS[f.group] ?? '📄', fields: [] };
    groups[f.group].fields.push(f);
  }

  const container = document.getElementById('field-groups');
  container.innerHTML = Object.entries(groups).map(([groupName, { icon, fields }]) => `
    <div class="field-group">
      <div class="field-group-header">
        <span class="field-group-icon">${icon}</span>
        <span class="field-group-title">${groupName}</span>
        <label class="field-group-toggle" title="Seleziona/deseleziona gruppo">
          <input type="checkbox" class="group-cb" data-group="${groupName}"
            onchange="toggleGroup('${groupName}', this.checked)">
          Tutti
        </label>
      </div>
      <div class="field-grid">
        ${fields.map(f => {
          const isEnabled = !enabledFields || enabledFields.includes(f.path);
          return `
          <label class="field-item${f.required ? ' disabled-field' : ''}">
            <input type="checkbox" class="field-cb"
              data-path="${f.path}" data-group="${groupName}"
              ${isEnabled ? 'checked' : ''}
              ${f.required ? 'disabled' : ''}
              onchange="_syncGroupCheckbox('${groupName}'); _updatePreview()">
            <div class="field-item-body">
              <div class="field-item-name">
                ${f.label}
                ${f.required ? '<span class="field-required-badge">fisso</span>' : ''}
              </div>
              <div class="field-item-path">${f.path}</div>
              <div class="field-item-desc">${f.desc}</div>
            </div>
          </label>`;
        }).join('')}
      </div>
    </div>
  `).join('');

  // Inizializza i checkbox di gruppo
  Object.keys(groups).forEach(g => _syncGroupCheckbox(g));
  _updatePreview();
}

async function saveOutputFields() {
  const checked = _getChecked();
  const allPaths = OUTPUT_FIELD_DEFS.map(f => f.path);
  const isAll = allPaths.every(p => checked.includes(p));
  const enabledFields = isAll ? null : checked;

  await apiFetch('/api/config/output-fields', 'PUT', { enabledFields });

  const msg = document.getElementById('output-msg');
  const count = enabledFields ? enabledFields.length : OUTPUT_FIELD_DEFS.length;
  msg.textContent = `Configurazione salvata — ${count} campi abilitati`;
  msg.className = 'msg';
  setTimeout(() => { msg.textContent = ''; }, 3500);
}

// ─── Filtri ──────────────────────────────────────────────────────────────────

async function loadFilters() {
  const filters = await apiFetch('/api/config/filters');
  const container = document.getElementById('filters-list');
  if (!container) return;
  if (!filters || filters.length === 0) {
    container.innerHTML = '<div class="loading">Nessun filtro configurato</div>';
    return;
  }
  container.innerHTML = filters.map(f => {
    const conds = [];
    if (f.conditions.drugCategories?.length) conds.push(`Farmaco: ${f.conditions.drugCategories.join(', ')}`);
    if (f.conditions.ward) conds.push(`Reparto: ${f.conditions.ward}`);
    if (f.conditions.urgency) conds.push(`Urgenza: ${f.conditions.urgency}`);
    return `
      <div class="filter-row ${f.enabled ? '' : 'disabled'}">
        <div class="filter-info">
          <div class="filter-name">
            <span class="filter-priority-badge">P${f.priority}</span>
            ${f.name}
            ${f.enabled ? '' : '<span style="color:#a0aec0;font-size:.8rem"> (disabilitato)</span>'}
          </div>
          <div class="filter-detail">
            ${conds.length ? conds.map(c => `<span class="filter-badge">${c}</span>`).join('') : '<span class="filter-badge">Qualsiasi</span>'}
          </div>
        </div>
        <div style="display:flex;gap:.5rem;flex-shrink:0">
          <button class="btn-sm" onclick="toggleFilter('${f.id}', ${!f.enabled})">${f.enabled ? 'Disabilita' : 'Abilita'}</button>
          <button class="btn-sm btn-danger" onclick="deleteFilter('${f.id}')">Elimina</button>
        </div>
      </div>`;
  }).join('');
}

async function createFilter() {
  const name = document.getElementById('f-name').value.trim();
  const priority = parseInt(document.getElementById('f-priority').value) || 10;
  const catsRaw = document.getElementById('f-categories').value.trim();
  const urgency = document.getElementById('f-urgency').value || null;
  const ward = document.getElementById('f-ward').value.trim() || null;

  if (!name) return alert('Inserisci un nome per il filtro');

  const conditions = {
    drugCategories: catsRaw ? catsRaw.split(',').map(s => s.trim().toUpperCase()) : null,
    urgency,
    ward,
  };

  await apiFetch('/api/config/filters', 'POST', {
    name, priority, enabled: true, conditions,
  });

  document.getElementById('f-name').value = '';
  document.getElementById('f-categories').value = '';
  document.getElementById('f-ward').value = '';
  document.getElementById('f-urgency').value = '';
  loadFilters();
}

async function toggleFilter(id, enabled) {
  await apiFetch(`/api/config/filters/${id}`, 'PUT', { enabled });
  loadFilters();
}

async function deleteFilter(id) {
  if (!confirm('Eliminare questo filtro?')) return;
  await apiFetch(`/api/config/filters/${id}`, 'DELETE');
  loadFilters();
}

// ─── Categorie Farmaco ───────────────────────────────────────────────────────

// Cache ATC level2 per i select
let _atcLevel2Cache = [];

async function loadCategories() {
  // Carica categorie e ATC level2 in parallelo
  const [cats, atcL2] = await Promise.all([
    apiFetch('/api/drug-categories'),
    apiFetch('/api/drug-categories/atc/level2'),
  ]);
  _atcLevel2Cache = atcL2 ?? [];

  const container = document.getElementById('cat-list');
  if (!container) return;
  if (!cats || cats.length === 0) {
    container.innerHTML = '<div class="loading">Nessuna categoria configurata</div>';
    return;
  }

  container.innerHTML = cats.map(cat => {
    const atcOptions = _atcLevel2Cache
      .filter(a => !(cat.atcCodes ?? []).some(x => x.code === a.code))
      .map(a => `<option value="${a.code}">[${a.code}] ${a.nameIt}</option>`)
      .join('');

    return `
    <div class="cat-card ${cat.active ? '' : 'inactive'}" id="cat-${cat.code}">
      <div class="cat-header">
        <span class="cat-code">${cat.code}</span>
        <span class="cat-label">${cat.label}</span>
        <span class="${cat.active ? 'badge-active' : 'badge-inactive'}">${cat.active ? 'Attiva' : 'Disattiva'}</span>
        <div class="cat-actions">
          <button class="btn-sm ${cat.active ? 'btn-danger' : 'btn-primary'}"
            onclick="toggleCategory('${cat.code}', ${!cat.active})">
            ${cat.active ? 'Disattiva' : 'Attiva'}
          </button>
          <button class="btn-sm btn-danger" onclick="deleteCategory('${cat.code}')">Elimina</button>
        </div>
      </div>
      ${cat.description ? `<div class="cat-desc">${cat.description}</div>` : ''}

      <!-- Alias -->
      <div class="alias-list" id="aliases-${cat.code}">
        ${(cat.aliases ?? []).map(a => `
          <span class="alias-tag">
            ${a.alias}
            <span class="lang">${a.language}</span>
            <button class="del-alias" title="Rimuovi alias" onclick="deleteAlias(${a.id})">×</button>
          </span>`).join('')}
        ${(cat.aliases ?? []).length === 0 ? '<span style="font-size:.78rem;color:#a0aec0">Nessun alias</span>' : ''}
      </div>
      <div class="alias-add-row">
        <input type="text" id="alias-input-${cat.code}" placeholder="Nuovo alias (es. CITOTOSSICI)"
          style="text-transform:uppercase"
          onkeydown="if(event.key==='Enter') addAlias('${cat.code}')">
        <select id="alias-lang-${cat.code}">
          <option value="IT">IT</option>
          <option value="EN">EN</option>
          <option value="OTHER">Altro</option>
        </select>
        <button class="btn-sm btn-primary" onclick="addAlias('${cat.code}')">+ Alias</button>
      </div>

      <!-- Codici ATC -->
      <div class="atc-section">
        <div class="atc-section-title">Codici ATC associati</div>
        <div style="display:flex;flex-wrap:wrap;gap:.35rem;margin-bottom:.5rem">
          ${(cat.atcCodes ?? []).map(a => `
            <span class="atc-tag">
              <strong>${a.code}</strong>
              <span>${a.nameIt}</span>
              <span class="atc-l1">${a.level1Code} · ${a.level1NameIt}</span>
              <button class="del-atc" title="Rimuovi associazione ATC"
                onclick="removeAtcMapping(event, ${a.mappingId})">×</button>
            </span>`).join('')}
          ${(cat.atcCodes ?? []).length === 0 ? '<span style="font-size:.78rem;color:#a0aec0">Nessun codice ATC associato</span>' : ''}
        </div>
        <div class="atc-add-row">
          <select id="atc-select-${cat.code}">
            <option value="">— Seleziona codice ATC —</option>
            ${atcOptions}
          </select>
          <button class="btn-sm btn-primary" onclick="addAtcMapping('${cat.code}')">+ ATC</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

async function createCategory() {
  const code  = document.getElementById('new-cat-code').value.trim().toUpperCase();
  const label = document.getElementById('new-cat-label').value.trim();
  const description = document.getElementById('new-cat-desc').value.trim();
  if (!code || !label) return alert('Inserisci codice ed etichetta');
  const result = await apiFetch('/api/drug-categories', 'POST', { code, label, description });
  if (!result) return;
  document.getElementById('new-cat-code').value = '';
  document.getElementById('new-cat-label').value = '';
  document.getElementById('new-cat-desc').value = '';
  loadCategories();
}

async function toggleCategory(code, active) {
  await apiFetch(`/api/drug-categories/${code}`, 'PUT', { active });
  loadCategories();
}

async function deleteCategory(code) {
  if (!confirm(`Eliminare la categoria "${code}" e tutti i suoi alias?`)) return;
  await apiFetch(`/api/drug-categories/${code}`, 'DELETE');
  loadCategories();
}

async function addAlias(categoryCode) {
  const input = document.getElementById(`alias-input-${categoryCode}`);
  const langSel = document.getElementById(`alias-lang-${categoryCode}`);
  const alias = (input?.value ?? '').trim().toUpperCase();
  const language = langSel?.value ?? 'IT';
  if (!alias) return;
  const result = await apiFetch(`/api/drug-categories/${categoryCode}/aliases`, 'POST', { alias, language });
  if (!result) return;
  input.value = '';
  loadCategories();
}

async function deleteAlias(id) {
  await apiFetch(`/api/drug-categories/aliases/${id}`, 'DELETE');
  loadCategories();
}

async function addAtcMapping(categoryCode) {
  const sel = document.getElementById(`atc-select-${categoryCode}`);
  const atcCode = sel?.value;
  if (!atcCode) return;
  await apiFetch(`/api/drug-categories/${categoryCode}/atc`, 'POST', { atcCode });
  loadCategories();
}

async function removeAtcMapping(event, mappingId) {
  event.stopPropagation();
  if (!mappingId) return;
  await apiFetch(`/api/drug-categories/atc-mappings/${mappingId}`, 'DELETE');
  loadCategories();
}

async function loadAtcHierarchy() {
  const hierarchy = await apiFetch('/api/drug-categories/atc/hierarchy');
  const container = document.getElementById('atc-hierarchy');
  if (!container) return;
  if (!hierarchy || hierarchy.length === 0) {
    container.innerHTML = '<div class="loading">Nessun dato ATC disponibile</div>';
    return;
  }
  container.innerHTML = hierarchy.map(g => `
    <div class="atc-group">
      <div class="atc-group-header" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'flex':'none'">
        <span class="atc-group-code">${g.code}</span>
        <span class="atc-group-name">${g.nameIt}</span>
        <span style="font-size:.75rem;color:#a0aec0;margin-left:.5rem">${g.nameEn}</span>
        <span style="margin-left:auto;color:#a0aec0;font-size:.8rem">${g.subgroups.length} sottogruppi ▾</span>
      </div>
      <div class="atc-group-body" style="display:none">
        ${g.subgroups.map(s => `
          <span class="atc-l2-badge" title="${s.nameEn}">
            <span class="atc-l2-code">${s.code}</span>
            <span class="atc-l2-it">${s.nameIt}</span>
          </span>`).join('')}
        ${g.subgroups.length === 0 ? '<span style="color:#a0aec0;font-size:.78rem">Nessun sottogruppo</span>' : ''}
      </div>
    </div>
  `).join('');
}

// ─── Utils ────────────────────────────────────────────────────────────────────

async function apiFetch(url, method = 'GET', body = null) {
  try {
    const opts = { method, headers: { 'Content-Type': 'application/json' }, cache: 'no-store' };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(url, opts);
    if (!res.ok) return null;
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  } catch { return null; }
}

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('it-IT') + ' ' + d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}
