ShyFog.Client.bigMin = (...values) => {
  var min = values[0];
  for (var i = 1; i < values.length; i++) {
    if (values[i].lt(min)) {
      min = values[i];
    }
  }
  return min;
};
ShyFog.Client.bigFloor = x => x.lt(0) ? x.round(0, Big.roundDown).minus(x.eq(x.round(0, Big.roundDown)) ? 0 : 1) : x.round(0, Big.roundDown);
ShyFog.Client.bigToNumber = x => parseFloat(x.toString());
ShyFog.Client.collidesAABB = (a, b, edgeX, edgeY) => {
  var result = false;
  if (edgeX && edgeY) {
    result = a.x.lte(b.x.add(b.width)) && a.x.add(a.width).gte(b.x) && a.y.gte(b.y.sub(b.height)) && a.y.sub(a.height).lte(b.y);
  } else if (edgeX) {
    result = a.x.lte(b.x.add(b.width)) && a.x.add(a.width).gte(b.x) && a.y.gt(b.y.sub(b.height)) && a.y.sub(a.height).lt(b.y);
  } else if (edgeY) {
    result = a.x.lt(b.x.add(b.width)) && a.x.add(a.width).gt(b.x) && a.y.gte(b.y.sub(b.height)) && a.y.sub(a.height).lte(b.y);
  } else {
    result = a.x.lt(b.x.add(b.width)) && a.x.add(a.width).gt(b.x) && a.y.gt(b.y.sub(b.height)) && a.y.sub(a.height).lt(b.y);
  }
  if (!result) {
    return result;
  }
  var overlapLeft = a.x.add(a.width).sub(b.x);
  var overlapRight = b.x.add(b.width).sub(a.x);
  var overlapTop = a.y.sub(b.y.sub(b.height));
  var overlapBottom = b.y.sub(a.y.sub(a.height));
  var minOverlap = ShyFog.Client.bigMin(overlapLeft, overlapRight, overlapTop, overlapBottom);
  if (minOverlap.eq(overlapTop)) {
    return "top";
  }
  if (minOverlap.eq(overlapBottom)) {
    return "bottom";
  }
  if (minOverlap.eq(overlapLeft)) {
    return "left";
  }
  if (minOverlap.eq(overlapRight)) {
    return "right";
  }
};