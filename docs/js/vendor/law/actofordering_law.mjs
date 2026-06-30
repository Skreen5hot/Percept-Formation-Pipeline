export default {
  "@type": "w2fuel:CompiledLaw",
  "source": "actofordering_law-remediation-proposal.ttl",
  "classes": [
    "cco:ont00000005",
    "cco:ont00000487",
    "cco:ont00000686",
    "cco:ont00001017",
    "cco:ont00001180",
    "cco:ont00001262",
    "fan:ActOfOrdering",
    "fan:CustomerRole",
    "fan:Date",
    "fan:Party",
    "fan:Product",
    "fan:ShipInfo",
    "obo:BFO_0000008",
    "obo:BFO_0000023",
    "obo:BFO_0000040"
  ],
  "subClassOf": {
    "fan:ActOfOrdering": [
      "cco:ont00000005"
    ],
    "fan:Party": [
      "cco:ont00001017"
    ],
    "fan:CustomerRole": [
      "obo:BFO_0000023"
    ],
    "fan:Product": [
      "obo:BFO_0000040"
    ],
    "fan:Date": [
      "obo:BFO_0000008"
    ],
    "fan:ShipInfo": [
      "cco:ont00000686"
    ]
  },
  "subClassOfClosure": {
    "fan:ActOfOrdering": [
      "cco:ont00000005"
    ],
    "fan:Party": [
      "cco:ont00001017"
    ],
    "fan:CustomerRole": [
      "obo:BFO_0000023"
    ],
    "fan:Product": [
      "obo:BFO_0000040"
    ],
    "fan:Date": [
      "obo:BFO_0000008"
    ],
    "fan:ShipInfo": [
      "cco:ont00000686"
    ]
  },
  "disjointWith": {},
  "properties": {
    "fan:hasEmployee": {
      "domain": "fan:ActOfOrdering",
      "range": "cco:ont00001017",
      "fillerKind": "reference",
      "multiplicity": "one"
    },
    "fan:hasOrderer": {
      "domain": "fan:ActOfOrdering",
      "range": "cco:ont00001017",
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
    "fan:hasShipToParty": {
      "domain": "fan:ShipInfo",
      "range": "cco:ont00001017"
    },
    "fan:hasShipper": {
      "domain": "fan:ActOfOrdering",
      "range": "cco:ont00001180",
      "fillerKind": "reference",
      "multiplicity": "one"
    },
    "fan:hasSupplier": {
      "domain": "fan:ActOfOrdering",
      "range": "cco:ont00001180",
      "fillerKind": "reference",
      "multiplicity": "one"
    },
    "fan:orderOccupies": {
      "domain": "fan:ActOfOrdering",
      "range": "fan:Date",
      "fillerKind": "reference",
      "multiplicity": "one",
      "ownTime": true
    },
    "fan:requiredOccupies": {
      "domain": "fan:ActOfOrdering",
      "range": "fan:Date",
      "fillerKind": "reference",
      "multiplicity": "one"
    },
    "fan:shipToLocation": {
      "domain": "fan:ShipInfo",
      "range": "cco:ont00000487"
    },
    "fan:shippedOccupies": {
      "domain": "fan:ActOfOrdering",
      "range": "fan:Date",
      "fillerKind": "reference",
      "multiplicity": "one"
    }
  },
  "frames": {
    "fan:ActOfOrdering": {
      "roles": [
        {
          "role": "hasOrderer",
          "relatumType": "cco:ont00001017",
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
          "fillerKind": "reference",
          "constitutive": true,
          "multiplicity": "one"
        }
      ]
    }
  },
  "rcr": {
    "fan:ActOfOrdering": {
      "constitutive": [
        "fan:hasOrderer",
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
