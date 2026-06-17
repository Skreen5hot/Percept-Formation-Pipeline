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
