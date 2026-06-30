// S4 probe: emit a graph exercising (a) a typed literal {value,datatype}, (b) a cco: co-type,
// (c) an obo: role edge -- the three things S4 must serialize. Prints Turtle to stdout for the
// rdflib asserter (the real parse is the verification, not a string-contains check).
import { toTurtle } from '../src/serialize.mjs';

const triples = [
  { s: 'fdata:date/ord-1-orderOccupies', p: 'rdf:type', o: 'fan:Date' },
  { s: 'fdata:date/ord-1-orderOccupies', p: 'fan:dateValue', o: { value: '1996-07-04', datatype: 'xsd:date' } },
  { s: 'fdata:Party/C1', p: 'rdf:type', o: 'cco:ont00001180' },
  { s: 'fdata:Party/C1', p: 'obo:BFO_0000196', o: 'fdata:role/ord-1-hasOrderer' },
];
process.stdout.write(toTurtle(triples) + '\n');
