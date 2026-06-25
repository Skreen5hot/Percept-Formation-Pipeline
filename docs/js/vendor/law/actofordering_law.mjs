export default {
  "@type": "w2fuel:CompiledLaw",
  "source": "actofordering_law.ttl",
  "classes": [
    "fan:ActOfOrdering",
    "fan:Customer",
    "fan:Date",
    "fan:Employee",
    "fan:Product",
    "fan:ShipInfo",
    "fan:Shipper",
    "fan:Supplier",
    "http://purl.obolibrary.org/obo/BFO_0000008",
    "https://www.commoncoreontologies.org/ont00000005",
    "https://www.commoncoreontologies.org/ont00000472",
    "https://www.commoncoreontologies.org/ont00000995",
    "https://www.commoncoreontologies.org/ont00001017",
    "https://www.commoncoreontologies.org/ont00001180",
    "https://www.commoncoreontologies.org/ont00001262"
  ],
  "subClassOf": {
    "fan:ActOfOrdering": [
      "https://www.commoncoreontologies.org/ont00000005"
    ],
    "fan:Customer": [
      "https://www.commoncoreontologies.org/ont00001017"
    ],
    "fan:Product": [
      "https://www.commoncoreontologies.org/ont00000995"
    ],
    "fan:Employee": [
      "https://www.commoncoreontologies.org/ont00001262"
    ],
    "fan:Supplier": [
      "https://www.commoncoreontologies.org/ont00001180"
    ],
    "fan:Shipper": [
      "https://www.commoncoreontologies.org/ont00001180"
    ],
    "fan:ShipInfo": [
      "https://www.commoncoreontologies.org/ont00000472"
    ],
    "fan:Date": [
      "http://purl.obolibrary.org/obo/BFO_0000008"
    ]
  },
  "subClassOfClosure": {
    "fan:ActOfOrdering": [
      "https://www.commoncoreontologies.org/ont00000005"
    ],
    "fan:Customer": [
      "https://www.commoncoreontologies.org/ont00001017"
    ],
    "fan:Product": [
      "https://www.commoncoreontologies.org/ont00000995"
    ],
    "fan:Employee": [
      "https://www.commoncoreontologies.org/ont00001262"
    ],
    "fan:Supplier": [
      "https://www.commoncoreontologies.org/ont00001180"
    ],
    "fan:Shipper": [
      "https://www.commoncoreontologies.org/ont00001180"
    ],
    "fan:ShipInfo": [
      "https://www.commoncoreontologies.org/ont00000472"
    ],
    "fan:Date": [
      "http://purl.obolibrary.org/obo/BFO_0000008"
    ]
  },
  "disjointWith": {},
  "properties": {
    "fan:hasCustomer": {
      "domain": "fan:ActOfOrdering",
      "range": "fan:Customer",
      "fillerKind": "reference",
      "multiplicity": "one"
    },
    "fan:hasEmployee": {
      "domain": "fan:ActOfOrdering",
      "range": "fan:Employee",
      "fillerKind": "reference",
      "multiplicity": "one"
    },
    "fan:hasProduct": {
      "domain": "fan:ActOfOrdering",
      "range": "fan:Product",
      "fillerKind": "reference",
      "multiplicity": "one"
    },
    "fan:hasShipInfo": {
      "domain": "fan:ActOfOrdering",
      "range": "fan:ShipInfo",
      "fillerKind": "reference",
      "multiplicity": "one"
    },
    "fan:hasShipper": {
      "domain": "fan:ActOfOrdering",
      "range": "fan:Shipper",
      "fillerKind": "reference",
      "multiplicity": "one"
    },
    "fan:hasSupplier": {
      "domain": "fan:ActOfOrdering",
      "range": "fan:Supplier",
      "fillerKind": "reference",
      "multiplicity": "one"
    },
    "fan:orderOccupies": {
      "domain": "fan:ActOfOrdering",
      "range": "fan:Date",
      "fillerKind": "literal",
      "multiplicity": "one",
      "inherence": true
    },
    "fan:requiredOccupies": {
      "domain": "fan:ActOfOrdering",
      "range": "fan:Date",
      "fillerKind": "literal",
      "multiplicity": "one"
    },
    "fan:shippedOccupies": {
      "domain": "fan:ActOfOrdering",
      "range": "fan:Date",
      "fillerKind": "literal",
      "multiplicity": "one"
    }
  },
  "frames": {
    "fan:ActOfOrdering": {
      "roles": [
        {
          "role": "hasCustomer",
          "relatumType": "fan:Customer",
          "fillerKind": "reference",
          "constitutive": true,
          "multiplicity": "one"
        },
        {
          "role": "hasProduct",
          "relatumType": "fan:Product",
          "fillerKind": "reference",
          "constitutive": true,
          "multiplicity": "one"
        },
        {
          "role": "orderOccupies",
          "relatumType": "fan:Date",
          "fillerKind": "literal",
          "constitutive": true,
          "multiplicity": "one"
        }
      ]
    }
  },
  "rcr": {
    "fan:ActOfOrdering": {
      "constitutive": [
        "fan:hasCustomer",
        "fan:hasProduct",
        "fan:orderOccupies"
      ],
      "accidental": [
        "fan:hasEmployee",
        "fan:hasShipInfo",
        "fan:hasShipper",
        "fan:hasSupplier",
        "fan:requiredOccupies",
        "fan:shippedOccupies"
      ]
    }
  }
};
