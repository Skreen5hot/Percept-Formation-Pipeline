export const SAMPLE_CSV = `process_name,pcf_id,hierarchy_id,category
Develop business strategy,10015,1.2,Develop Vision and Strategy
Develop and measure strategic initiatives,10016,1.3,Develop Vision and Strategy
Manage product and service portfolio,10061,2.1.1,Develop and Manage Products and Services
Develop products and services,10062,2.3,Develop and Manage Products and Services
"Understand markets, customers, and capabilities",10101,3.1,Market and Sell Products and Services
Develop marketing strategy,10102,3.2,Market and Sell Products and Services
Establish incentive strategy,10210,7.1.2.3.1,Develop and Manage Human Capital
Plan for and align supply chain resources,10215,4.1,Manage Supply Chain for Physical Products
Procure materials and services,10216,4.2,Manage Supply Chain for Physical Products
Service products,10218,6.3.4,Manage Customer Service
Establish performance indicators (measures),10270,13.6.3.1,Develop and Manage Business Capabilities
Establish monitoring frequency,10271,13.6.3.2,Develop and Manage Business Capabilities`;

// A MISLABELED shipment: two vehicle columns and NO driver. The Binder, lacking an agent, is forced to map
// the spare vehicle into the agent role -- and OCE REJECTS it: a vehicle cannot be the agent, because the
// law makes fan:Vehicle disjoint with fan:Agent. The dictionary records the rejection and names the law.
export const MISLABELED_CSV = `truck_id,vehicle_id,origin,destination,ship_date
T1,V1,Boston,Denver,2024-01-05
T2,V2,Miami,Reno,2024-02-01
T3,V3,Akron,Tampa,2024-03-01
T4,V4,Provo,Salem,2024-04-01
T5,V5,Mesa,Waco,2024-05-01
T6,V6,Erie,Bend,2024-06-01`;

// DIRTY data: driver_id mixes string + numeric ids (a SPLIT distribution -> taint L2) yet still grounds to
// fan:Driver, binds hasAgent, and OCE FULFILLS it (Driver subClassOf Agent) -- the "fulfilled AND tainted"
// star: usable, correct, and uncertain at once. ref_code is also split (L2) but grounds to nothing -> n/a.
// One run shows the graded honesty: clean L1 fields beside an L2-fulfilled field beside an L2-unbound one.
export const DIRTY_CSV = `driver_id,truck_id,origin,destination,ship_date,ref_code
D1,T1,Boston,Denver,2024-01-05,A1
1002,T2,Miami,Reno,2024-02-01,99
D3,T3,Akron,Tampa,2024-03-01,B2
1004,T4,Provo,Salem,2024-04-01,7
D5,T5,Mesa,Waco,2024-05-01,C3
1006,T6,Erie,Bend,2024-06-01,42`;

// CLINICAL measurement: subject_id, the glucose VALUE, and the time. The Binder abductively selects the
// fan:ActOfMeasuring frame (not shipping). subject + value + time bind and OCE fulfills them; the law's other
// constitutive participants -- performer, instrument, specimen -- have no column, so they are DERIVED as
// implicit entities. The SPECIMEN is special: the measured glucose is a quality that must inhere in a
// material continuant, and the law names that bearer a specimen -> the value (present) entails the specimen
// (absent) BY INHERENCE, cited to the axiom. Performer + instrument are ordinary missing roles; the specimen
// is the non-obvious derivation. (No goods/agent/vehicle columns -> shipping does not fit -> no dispute.)
export const CLINICAL_CSV = `subject_id,glucose_mg_dl,measured_at
S1,95,2024-01-05
S2,102,2024-02-01
S3,88,2024-03-01
S4,110,2024-04-01
S5,99,2024-05-01
S6,120,2024-06-01`;

// DISPUTED data: a transaction (counterparty, amount, date) that is honestly ambiguous between a SALE (read
// from the seller's books) and a PURCHASE (read from the buyer's). Every column legitimately fills a role in
// BOTH frames, so the Binder scores them EQUALLY and DECLINES TO CHOOSE -- two candidates recorded, routed to
// a commit gate, no winner. The dictionary's headline is the REFUSAL (datasetStatus 'disputed', taint L4 --
// "disputed between competing laws"), not a single frame's verdict. Each reading implies a different
// unwitnessed party (the seller vs the buyer).
export const DISPUTED_CSV = `counterparty_id,amount,date
Acme,1200,2024-01-05
Beta,980,2024-02-01
Ciri,1500,2024-03-01
Delta,640,2024-04-01`;
