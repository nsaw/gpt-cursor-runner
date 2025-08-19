const fs = require("fs");
const path = "services/registry/registry.json";
let counter = 0;

module.exports.register = (name, port) => {
  const reg = fs.existsSync(path) ? JSON.parse(fs.readFileSync(path)) : {};
  reg[name] = { port };
  fs.writeFileSync(path, JSON.stringify(reg, null, 2));
};

module.exports.resolve = (name) => {
  const reg = JSON.parse(fs.readFileSync(path));
  return reg[name];
};

module.exports.roundRobin = (name) => {
  const reg = JSON.parse(fs.readFileSync(path));
  const services = Object.entries(reg).filter(([n]) => n.startsWith(name));
  const service = services[counter % services.length];
  counter++;
  return service[1];
};
