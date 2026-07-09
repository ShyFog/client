ShyFog.Client.Mixin = class {
  constructor() {
    ShyFog.Client.log("INFO", `Mixin created: ${this.constructor.name}`);
  }
  inject({ target, at, method }) {
    ShyFog.Client.log("INFO", `Injecting mixin "${this.constructor.name}" into ${target}@${at}...`);
    var originalTarget = ShyFog.Client[target];
    if (typeof originalTarget !== "function") {
      return ShyFog.Client.log("ERROR", `Invalid target ${target}@${at} to inject`);
    }
    function fakeTarget(...args) {
      var result = {};
      if (at == "HEAD") {
        result = method(...args) || result;
      }
      if (result.cancel) {
        return result.returnValue;
      }
      var originalResult = originalTarget(...(result.args || args));
      if (at == "TAIL") {
        result = method(...args, originalResult) || result;
      }
      return (result.returnValue || originalResult);
    }
    ShyFog.Client[target] = fakeTarget;
    ShyFog.Client.log("INFO", "Injection success");
  }
};