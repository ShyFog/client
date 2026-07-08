ShyFog.Mixin = class {
  inject({ target, at, method }) {
    try {
      var originalTarget = eval(target);
    } catch {
      throw `Mixin injection failed: Invalid target "${target}".`;
    }
    if (typeof originalTarget !== "function") {
      throw `Mixin injection failed: Target "${target}" is not a function.`;
    }
    function fakeTarget(...args) {
      var result = {};
      if (at == "HEAD") {
        result = method(...args) || result;
      }
      if (result.cancel) {
        return;
      }
      var originalResult = originalTarget(...(result.args || args));
      if (at == "TAIL") {
        result = method(...args, originalResult) || result;
      }
      return (result.returnValue || originalResult);
    }
    try {
      eval(`${target} = fakeTarget;`);
    } catch {
      throw "Mixin injection failed: Failed to inject.";
    }
  }
};