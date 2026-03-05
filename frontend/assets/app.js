const API = '';

// ─── Lookup tables cappe ─────────────────────────────────────────────────────

const CAPPA_TYPES = {
  FLUSSO_LAMINARE_VERTICALE:   'Flusso laminare verticale',
  FLUSSO_LAMINARE_ORIZZONTALE: 'Flusso laminare orizzontale',
  ISOLATORE:                   'Isolatore',
  BSC:                         'Cappa biologica (BSC)',
  CHIMICA:                     'Cappa chimica',
  DISPENSAZIONE:               'Postazione dispensazione',
  ALTRO:                       'Altro',
};

const STATUS_LABELS = {
  ONLINE:       'Online',
  OFFLINE:      'Offline',
  MANUTENZIONE: 'Manutenzione',
  GUASTO:       'Guasto',
};

const STATUS_CSS = {
  ONLINE:       'status-online',
  OFFLINE:      'status-offline',
  MANUTENZIONE: 'status-manutenzione',
  GUASTO:       'status-guasto',
};

// ─── Dashboard ──────────────────────────────────────────────────────────────

async function loadCappe() {
  const cappe = await apiFetch('/api/cappe');
  const container = document.getElementById('cappe-cards');
  if (!container) return;
  if (!cappe || cappe.length === 0) {
    container.innerHTML = '<div class="card"><div class="card-title">Nessuna cappa configurata</div><div class="card-label">Vai su <a href="/cappe.html">Cappe</a> per aggiungerne</div></div>';
    return;
  }
  container.innerHTML = cappe.map(c => {
    const queueData = c.queue ?? [];
    const pending = queueData.filter(i => i.status !== 'COMPLETED').length;
    const status = c.status ?? 'ONLINE';
    const maxQ = c.maxQueueSize ?? 0;
    const queueLabel = maxQ > 0
      ? `${pending}<span style="font-size:.9rem;color:#718096">/${maxQ}</span>`
      : `${pending}`;
    const isEligible = c.active && status === 'ONLINE';
    const typeName = CAPPA_TYPES[c.type] ?? c.type ?? '—';
    return `
      <div class="card ${isEligible ? '' : 'inactive'}">
        <div class="card-badge status-badge ${STATUS_CSS[status] ?? ''}">${STATUS_LABELS[status] ?? status}</div>
        <div class="card-title">${c.name}</div>
        <div style="font-size:.7rem;color:#718096;margin-bottom:.4rem">${typeName}</div>
        <div class="card-queue">${queueLabel}</div>
        <div class="card-label">In coda</div>
        ${c.specializations?.length ? `<div class="card-specs">Spec: ${c.specializations.join(', ')}</div>` : ''}
        ${!c.active ? '<div class="card-specs" style="color:#e53e3e">Disabilitata</div>' : ''}
      </div>`;
  }).join('');
}

async function loadHistory() {
  const data = await apiFetch('/api/prescriptions');
  const tbody = document.getElementById('history-body');
  if (!tbody) return;
  if (!data || data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" class="empty">Nessuna prescrizione ricevuta</td></tr>';
    return;
  }
  tbody.innerHTML = data.map(p => {
    const prep = p.preparation;
    // Dosaggio: valore + unità (es. "75 mg")
    const dosaggio = prep.dosage ?? '—';
    // Contenitore finale: solvente + volume + concentrazione calcolata
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
      <td><strong>${p.assignedCappa.name}</strong></td>
      <td>${fmtDate(p.timestamps.received)}</td>
    </tr>`;
  }).join('');
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
    const data = await res.json();
    resultEl.textContent = JSON.stringify(data, null, 2);
    if (res.ok) { loadCappe(); loadHistory(); }
  } catch (e) {
    resultEl.textContent = 'Errore: ' + e.message;
  }
}

// ─── Cappe ───────────────────────────────────────────────────────────────────

async function loadCappeList() {
  const cappe = await apiFetch('/api/cappe');
  const container = document.getElementById('cappe-list');
  if (!container) return;
  if (!cappe || cappe.length === 0) {
    container.innerHTML = '<div class="loading">Nessuna cappa configurata</div>';
    return;
  }
  container.innerHTML = cappe.map(c => {
    const status = c.status ?? 'ONLINE';
    const pending = (c.queue ?? []).filter(i => i.status !== 'COMPLETED').length;
    const maxQ = c.maxQueueSize ?? 0;
    const queueText = maxQ > 0 ? `${pending}/${maxQ}` : `${pending}`;
    const typeName = CAPPA_TYPES[c.type] ?? c.type ?? '—';
    const statusBadge = `<span class="status-badge ${STATUS_CSS[status] ?? ''}">${STATUS_LABELS[status] ?? status}</span>`;
    const capacityWarn = maxQ > 0 && pending >= maxQ
      ? `<span style="color:#e53e3e;font-size:.75rem;font-weight:600"> — Coda piena</span>` : '';
    return `
    <div class="cappa-row ${c.active ? '' : 'inactive'}" id="cappa-${c.id}">
      <div class="cappa-info">
        <div class="cappa-name">
          ${c.name}
          <small style="color:#a0aec0;font-weight:400">${c.id}</small>
          ${!c.active ? '<small style="color:#e53e3e;font-weight:600"> — Disabilitata</small>' : ''}
        </div>
        <div class="cappa-meta" style="display:flex;gap:.5rem;align-items:center;margin-top:.3rem;flex-wrap:wrap">
          ${statusBadge}
          <span style="color:#4a5568">${typeName}</span>
          <span style="color:#718096">|</span>
          <span style="color:#4a5568">Coda: <strong>${queueText}</strong>${capacityWarn}</span>
        </div>
        ${c.description ? `<div class="cappa-meta" style="margin-top:.25rem;font-style:italic;color:#718096">${c.description}</div>` : ''}
        ${c.specializations?.length ? `<div class="cappa-meta" style="margin-top:.2rem">Spec: ${c.specializations.join(', ')}</div>` : ''}
      </div>
      <div class="cappa-actions">
        <button class="btn-sm" onclick='openEdit(${JSON.stringify(c)})'>Modifica</button>
        <button class="btn-sm ${c.active ? 'btn-danger' : 'btn-primary'}" onclick="toggleCappa('${c.id}', ${!c.active})">
          ${c.active ? 'Disabilita' : 'Abilita'}
        </button>
        <button class="btn-sm btn-danger" onclick="deleteCappa('${c.id}')">Elimina</button>
      </div>
    </div>`;
  }).join('');
}

async function createCappa() {
  const name = document.getElementById('new-name').value.trim();
  const type = document.getElementById('new-type').value;
  const description = document.getElementById('new-desc').value.trim();
  const specsRaw = document.getElementById('new-specs').value.trim();
  const maxQueueSize = parseInt(document.getElementById('new-maxqueue').value, 10) || 0;
  if (!name) return alert('Inserisci un nome per la cappa');
  const specializations = specsRaw ? specsRaw.split(',').map(s => s.trim().toUpperCase()) : [];
  await apiFetch('/api/cappe', 'POST', { name, type, description, specializations, maxQueueSize });
  document.getElementById('new-name').value = '';
  document.getElementById('new-desc').value = '';
  document.getElementById('new-specs').value = '';
  document.getElementById('new-maxqueue').value = '0';
  document.getElementById('new-type').value = 'ALTRO';
  loadCappeList();
}

async function toggleCappa(id, active) {
  await apiFetch(`/api/cappe/${id}`, 'PUT', { active });
  loadCappeList();
}

async function deleteCappa(id) {
  if (!confirm('Eliminare questa cappa?')) return;
  await apiFetch(`/api/cappe/${id}`, 'DELETE');
  loadCappeList();
}

function openEdit(cappa) {
  document.getElementById('edit-id').value = cappa.id;
  document.getElementById('edit-name').value = cappa.name;
  document.getElementById('edit-type').value = cappa.type ?? 'ALTRO';
  document.getElementById('edit-desc').value = cappa.description ?? '';
  document.getElementById('edit-specs').value = (cappa.specializations ?? []).join(', ');
  document.getElementById('edit-status').value = cappa.status ?? 'ONLINE';
  document.getElementById('edit-maxqueue').value = cappa.maxQueueSize ?? 0;
  document.getElementById('modal').classList.remove('hidden');
}

function closeModal() { document.getElementById('modal').classList.add('hidden'); }

async function saveEdit() {
  const id = document.getElementById('edit-id').value;
  const name = document.getElementById('edit-name').value.trim();
  const type = document.getElementById('edit-type').value;
  const description = document.getElementById('edit-desc').value.trim();
  const specsRaw = document.getElementById('edit-specs').value.trim();
  const status = document.getElementById('edit-status').value;
  const maxQueueSize = parseInt(document.getElementById('edit-maxqueue').value, 10) || 0;
  const specializations = specsRaw ? specsRaw.split(',').map(s => s.trim().toUpperCase()) : [];
  await apiFetch(`/api/cappe/${id}`, 'PUT', { name, type, description, specializations, status, maxQueueSize });
  closeModal();
  loadCappeList();
}

// ─── Output Fields Configuration ─────────────────────────────────────────────

const OUTPUT_FIELD_DEFS = [
  // ── Generale ──────────────────────────────────────────────────────────────
  { group: 'Generale', groupKey: 'root', icon: '📋',
    path: 'prescriptionId',  label: 'ID Prescrizione',     desc: 'Identificatore UUID generato dal servizio',            required: true },
  { group: 'Generale', groupKey: 'root', icon: '📋',
    path: 'status',          label: 'Stato dispatch',       desc: 'Sempre "DISPATCHED" se l\'elaborazione è riuscita' },
  { group: 'Generale', groupKey: 'root', icon: '📋',
    path: 'priority',        label: 'Priorità',             desc: 'STAT | URGENT | ROUTINE' },
  { group: 'Generale', groupKey: 'root', icon: '📋',
    path: 'sourceFormat',    label: 'Formato sorgente',     desc: 'Protocollo in ingresso: HL7V2, FHIR_JSON, FHIR_XML, CDA_PRF' },
  { group: 'Generale', groupKey: 'root', icon: '📋',
    path: 'prescribedBy',    label: 'Medico prescrittore',  desc: 'Nome del medico che ha emesso la prescrizione' },
  { group: 'Generale', groupKey: 'root', icon: '📋',
    path: 'notes',           label: 'Note cliniche',        desc: 'Note o istruzioni aggiuntive allegate alla prescrizione' },
  { group: 'Generale', groupKey: 'root', icon: '📋',
    path: 'deliveryStatus',  label: 'Stato consegna API',   desc: 'SENT = risposta HTTP restituita al sistema terzo; PENDING = non ancora consegnata' },

  // ── Cappa assegnata ───────────────────────────────────────────────────────
  { group: 'Cappa Assegnata', groupKey: 'assignedCappa', icon: '🏭',
    path: 'assignedCappa.id',              label: 'ID cappa',             desc: 'Identificatore interno della cappa assegnata' },
  { group: 'Cappa Assegnata', groupKey: 'assignedCappa', icon: '🏭',
    path: 'assignedCappa.name',            label: 'Nome cappa',           desc: 'Nome descrittivo della cappa assegnata' },
  { group: 'Cappa Assegnata', groupKey: 'assignedCappa', icon: '🏭',
    path: 'assignedCappa.description',     label: 'Descrizione cappa',    desc: 'Note o descrizione configurata sulla cappa' },
  { group: 'Cappa Assegnata', groupKey: 'assignedCappa', icon: '🏭',
    path: 'assignedCappa.type',            label: 'Tipologia cappa',      desc: 'Tipo strutturale: FLUSSO_LAMINARE_VERTICALE, ISOLATORE, BSC, ecc.' },
  { group: 'Cappa Assegnata', groupKey: 'assignedCappa', icon: '🏭',
    path: 'assignedCappa.status',          label: 'Stato operativo',      desc: 'Stato corrente della cappa: ONLINE, OFFLINE, MANUTENZIONE, GUASTO' },
  { group: 'Cappa Assegnata', groupKey: 'assignedCappa', icon: '🏭',
    path: 'assignedCappa.specializations', label: 'Specializzazioni',     desc: 'Categorie farmaco per cui la cappa è attrezzata' },
  { group: 'Cappa Assegnata', groupKey: 'assignedCappa', icon: '🏭',
    path: 'assignedCappa.queueLength',     label: 'Preparazioni in coda', desc: 'Numero di preparazioni in coda al momento del dispatch (inclusa questa)' },
  { group: 'Cappa Assegnata', groupKey: 'assignedCappa', icon: '🏭',
    path: 'assignedCappa.maxQueueSize',    label: 'Capacità massima coda',desc: 'Limite massimo configurato sulla cappa (0 = illimitata)' },

  // ── Routing info ──────────────────────────────────────────────────────────
  { group: 'Routing', groupKey: 'routingInfo', icon: '🗺️',
    path: 'routingInfo.appliedFilter',   label: 'Filtro applicato',   desc: 'Nome del filtro che ha determinato l\'assegnazione (null se default)' },
  { group: 'Routing', groupKey: 'routingInfo', icon: '🗺️',
    path: 'routingInfo.fallbackUsed',    label: 'Fallback usato',     desc: 'true se la cappa target era non disponibile e si è usato il fallback' },
  { group: 'Routing', groupKey: 'routingInfo', icon: '🗺️',
    path: 'routingInfo.defaultStrategy', label: 'Strategia default',  desc: 'Strategia usata per la selezione della cappa' },

  // ── Paziente ──────────────────────────────────────────────────────────────
  { group: 'Paziente', groupKey: 'patient', icon: '👤',
    path: 'patient.id',         label: 'ID paziente',     desc: 'Identificatore paziente dal sistema sorgente' },
  { group: 'Paziente', groupKey: 'patient', icon: '👤',
    path: 'patient.name',       label: 'Nome paziente',   desc: 'Nome e cognome del paziente' },
  { group: 'Paziente', groupKey: 'patient', icon: '👤',
    path: 'patient.ward',       label: 'Reparto',         desc: 'Reparto di ricovero o reparto richiedente' },
  { group: 'Paziente', groupKey: 'patient', icon: '👤',
    path: 'patient.bedNumber',  label: 'Numero letto',    desc: 'Numero letto o stanza del paziente' },

  // ── Preparazione farmaco ──────────────────────────────────────────────────
  { group: 'Preparazione Farmaco', groupKey: 'preparation', icon: '💊',
    path: 'preparation.drug',                label: 'Nome farmaco',            desc: 'Denominazione del principio attivo' },
  { group: 'Preparazione Farmaco', groupKey: 'preparation', icon: '💊',
    path: 'preparation.category',            label: 'Categoria',               desc: 'Categoria terapeutica (CHEMOTHERAPY, ANTIBIOTIC, ecc.)' },
  { group: 'Preparazione Farmaco', groupKey: 'preparation', icon: '💊',
    path: 'preparation.code',                label: 'Codice ATC/AIC',          desc: 'Codice identificativo del farmaco (es. L01BA01)' },
  { group: 'Preparazione Farmaco', groupKey: 'preparation', icon: '💊',
    path: 'preparation.dosage',              label: 'Dosaggio',                desc: 'Dosaggio formattato (es. "75 mg")' },
  { group: 'Preparazione Farmaco', groupKey: 'preparation', icon: '💊',
    path: 'preparation.dosageValue',         label: 'Valore dosaggio',         desc: 'Valore numerico del dosaggio' },
  { group: 'Preparazione Farmaco', groupKey: 'preparation', icon: '💊',
    path: 'preparation.dosageUnit',          label: 'Unità dosaggio',          desc: 'Unità di misura del dosaggio (es. "mg", "UI")' },
  { group: 'Preparazione Farmaco', groupKey: 'preparation', icon: '💊',
    path: 'preparation.route',               label: 'Via di somministrazione', desc: 'IV, IM, PO, SC, ecc.' },
  { group: 'Preparazione Farmaco', groupKey: 'preparation', icon: '💊',
    path: 'preparation.solvent',             label: 'Solvente/diluente',       desc: 'Solvente (es. "NaCl 0.9%", "Glucosio 5%")' },
  { group: 'Preparazione Farmaco', groupKey: 'preparation', icon: '💊',
    path: 'preparation.volume',              label: 'Volume',                  desc: 'Volume del contenitore finale formattato (es. "250 ml")' },
  { group: 'Preparazione Farmaco', groupKey: 'preparation', icon: '💊',
    path: 'preparation.volumeValue',         label: 'Valore volume',           desc: 'Valore numerico del volume' },
  { group: 'Preparazione Farmaco', groupKey: 'preparation', icon: '💊',
    path: 'preparation.volumeUnit',          label: 'Unità volume',            desc: 'Unità del volume (es. "ml")' },
  { group: 'Preparazione Farmaco', groupKey: 'preparation', icon: '💊',
    path: 'preparation.infusionRate',        label: 'Velocità infusione',      desc: 'Velocità di infusione (es. "100 ml/h")' },
  { group: 'Preparazione Farmaco', groupKey: 'preparation', icon: '💊',
    path: 'preparation.finalConcentration',  label: 'Concentrazione finale',   desc: 'Concentrazione calcolata: dosaggio/volume (es. "0.3 mg/ml")' },
  { group: 'Preparazione Farmaco', groupKey: 'preparation', icon: '💊',
    path: 'preparation.frequency',           label: 'Frequenza',               desc: 'Frequenza di somministrazione (es. "QD", "BID", "Once")' },

  // ── Timestamp ─────────────────────────────────────────────────────────────
  { group: 'Timestamp', groupKey: 'timestamps', icon: '🕐',
    path: 'timestamps.received',   label: 'Data ricezione',  desc: 'Data/ora di ricezione della prescrizione (ISO 8601)' },
  { group: 'Timestamp', groupKey: 'timestamps', icon: '🕐',
    path: 'timestamps.dispatched', label: 'Data dispatch',   desc: 'Data/ora di assegnazione alla cappa (ISO 8601)' },
  { group: 'Timestamp', groupKey: 'timestamps', icon: '🕐',
    path: 'timestamps.requiredBy', label: 'Data richiesta',  desc: 'Data/ora entro cui la preparazione è necessaria (se presente)' },
  { group: 'Timestamp', groupKey: 'timestamps', icon: '🕐',
    path: 'timestamps.sentToApi',  label: 'Data invio API',  desc: 'Data/ora in cui la risposta HTTP è stata consegnata al sistema terzo (ISO 8601)' },
];

const _SAMPLE_OUTPUT = {
  prescriptionId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  status: 'DISPATCHED',
  deliveryStatus: 'SENT',
  priority: 'STAT',
  sourceFormat: 'FHIR_JSON',
  prescribedBy: 'Dott. Bianchi Luigi',
  notes: 'Somministrare lentamente — monitorare reazioni avverse',
  assignedCappa: {
    id: 'CAPPA_001', name: 'Cappa Chemioterapici',
    description: 'Cappa dedicata ai farmaci citotossici',
    type: 'FLUSSO_LAMINARE_VERTICALE', status: 'ONLINE',
    specializations: ['CHEMOTHERAPY', 'IMMUNOSUPPRESSANT'],
    queueLength: 3, maxQueueSize: 10,
  },
  routingInfo: { appliedFilter: 'Chemio su Cappa 1', fallbackUsed: false, defaultStrategy: 'drug_type' },
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
  const cfg = await apiFetch('/api/config/output-fields');
  const enabledFields = cfg?.enabledFields ?? null; // null = tutti abilitati

  // Raggruppa le definizioni per group
  const groups = {};
  for (const f of OUTPUT_FIELD_DEFS) {
    if (!groups[f.group]) groups[f.group] = { icon: f.icon, fields: [] };
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

async function loadCappeOptions() {
  const cappe = await apiFetch('/api/cappe');
  const sel = document.getElementById('f-cappa');
  if (!sel) return;
  sel.innerHTML = '<option value="">-- Usa strategia default --</option>' +
    (cappe ?? []).map(c => `<option value="${c.id}">${c.name}</option>`).join('');
}

async function loadFilters() {
  const filters = await apiFetch('/api/config/filters');
  const cappe = await apiFetch('/api/cappe');
  const cappaMap = Object.fromEntries((cappe ?? []).map(c => [c.id, c.name]));
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
    const targetName = f.targetCappaId ? (cappaMap[f.targetCappaId] ?? f.targetCappaId) : 'Strategia default';
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
            &rarr; <strong>${targetName}</strong>
            ${f.fallbackToDefault ? '&nbsp;(con fallback)' : ''}
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
  const targetCappaId = document.getElementById('f-cappa').value || null;
  const fallbackToDefault = document.getElementById('f-fallback').value === 'true';

  if (!name) return alert('Inserisci un nome per il filtro');

  const conditions = {
    drugCategories: catsRaw ? catsRaw.split(',').map(s => s.trim().toUpperCase()) : null,
    urgency,
    ward,
  };

  await apiFetch('/api/config/filters', 'POST', {
    name, priority, enabled: true, conditions, targetCappaId, fallbackToDefault,
  });

  document.getElementById('f-name').value = '';
  document.getElementById('f-categories').value = '';
  document.getElementById('f-ward').value = '';
  document.getElementById('f-urgency').value = '';
  document.getElementById('f-cappa').value = '';
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

// ─── Config page ─────────────────────────────────────────────────────────────

let selectedStrategy = null;

async function loadConfigPage() {
  const config = await apiFetch('/api/config');
  selectedStrategy = config?.defaultRoutingStrategy ?? 'load_balance';
  document.querySelectorAll('.strategy-card').forEach(card => {
    card.classList.toggle('selected', card.dataset.strategy === selectedStrategy);
    card.addEventListener('click', () => {
      selectedStrategy = card.dataset.strategy;
      document.querySelectorAll('.strategy-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
    });
  });
  document.getElementById('config-raw').textContent = JSON.stringify(config, null, 2);
}

async function saveStrategy() {
  if (!selectedStrategy) return;
  await apiFetch('/api/config/strategy', 'PUT', { strategy: selectedStrategy });
  const msg = document.getElementById('strategy-msg');
  msg.textContent = 'Strategia salvata: ' + selectedStrategy;
  msg.className = 'msg';
  setTimeout(() => msg.textContent = '', 3000);
  loadConfigPage();
}

// ─── Utils ────────────────────────────────────────────────────────────────────

async function apiFetch(url, method = 'GET', body = null) {
  try {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(url, opts);
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('it-IT') + ' ' + d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}
