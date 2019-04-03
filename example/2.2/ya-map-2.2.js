"use strict";

function CollectionCtrl($scope) {
  this.addGeoObjects = function (geoObject) {
    $scope.collection.add(geoObject);
  };
  this.removeGeoObjects = function (geoObject) {
    $scope.collection.remove(geoObject);
  };
}

function YaMapCtrl($scope, mapApiLoad) {
  var self = this;
  mapApiLoad(function () {
    self.addGeoObjects = function (obj) {
      $scope.map.geoObjects.add(obj);
    };
    self.removeGeoObjects = function (obj) {
      $scope.map.geoObjects.remove(obj);
    };

    self.addControl = function (name, options) {
      $scope.map.controls.add(name, options);
    };
    self.getMap = function () {
      return $scope.map;
    };
    self.addImageLayer = function (urlTemplate, options) {
      var imgLayer = new ymaps.Layer(urlTemplate, options);
      $scope.map.layers.add(imgLayer);
    };
    self.addHotspotLayer = function (urlTemplate, keyTemplate, options) {
      // Создадим источник данных слоя активных областей.
      var objSource = new ymaps.hotspot.ObjectSource(urlTemplate, keyTemplate);
      var hotspotLayer = new ymaps.hotspot.Layer(objSource, options);
      $scope.map.layers.add(hotspotLayer);
    };
  });
}

window.onYaMapLoad = function () {
  console.log('onYaMapLoad');
  defineArrow();
  ymaps.modules.require(['geoObject.Arrow'], function (Arrow) {
    ymaps.Arrow = Arrow;
  });
};

angular.module('yaMap', []).constant('GEOMETRY_TYPES', {
  POINT: 'Point',
  LINESTRING: 'LineString',
  RECTANGLE: 'Rectangle',
  POLYGON: 'Polygon',
  CIRCLE: 'Circle'
}).factory('mapApiLoad', [function () {
  var loaded = false;
  var callbacks = [];
  var runCallbacks = function () {
    var callback;
    while (callbacks.length) {
      callback = callbacks.splice(0, 1);
      callback[0]();
    }
  };
  var onYaMapLoaded = function () {
    ymaps.ready(function () {
      console.log('ymaps loaded');
      loaded = true;
      runCallbacks();
    });
  };
  if (window['ymaps']) {
    onYaMapLoaded();
  } else {
    window.onYaMapLoad = function () {
      onYaMapLoaded();
      defineArrow();
      ymaps.modules.require(['geoObject.Arrow'], function (Arrow) {
        ymaps.Arrow = Arrow;
      });
    };
  }
  return function (callback) {
    callbacks.push(callback);
    if (loaded) {
      runCallbacks();
    }
  };
}]).service('yaLayer', [function () {
  this.create = function (tileZoomFn, options) {
    return new ymaps.Layer(tileZoomFn, options);
  };
}]).service('yaMapType', [function () {
  this.create = function (name, layers) {
    return new ymaps.MapType(name, layers);
  };
}]).service('layerStorage', ['mapApiLoad', function (mapApiLoad) {
  this.get = function (callback) {
    if (this._storage) {
      callback(this._storage);
    } else {
      var self = this;
      mapApiLoad(function () {
        self._storage = ymaps.layer.storage;
        callback(self._storage);
      });
    }
  };
}]).service('mapTypeStorage', ['mapApiLoad', function (mapApiLoad) {
  this.get = function (callback) {
    if (this._storage) {
      callback(this._storage);
    } else {
      var self = this;
      mapApiLoad(function () {
        self._storage = ymaps.mapType.storage;
        callback(self._storage);
      });
    }
  };
}]).service('yaSubscriber', function () {
  var eventPattern = /^yaEvent(\w*)?([A-Z]{1}[a-z]+)$/;
  this.subscribe = function (target, parentGet, attrName, scope) {
    var res = eventPattern.exec(attrName);
    var eventName = res[2].toLowerCase();
    var propertyName = res[1] ? (res[1][1].toLowerCase() + res[1].substring(1)) : undefined;
    scope[attrName] = function (locals) {
      return parentGet(scope.$parent || scope, locals);
    };
    var events = propertyName ? target[propertyName].events : target.events;
    events.add(eventName, function (event) {
      setTimeout(function () {
        scope.$apply(function () {
          scope[attrName]({
            $event: event
          });
        });
      });
    });
  };
}).service('templateLayoutFactory', ['mapApiLoad', function (mapApiLoad) {
  this._cache = {};
  this.get = function (key) {
    return this._cache[key] || key;
  };
  this.create = function (key, template, overadice) {
    if (this._cache[key]) {
      return;
    }
    var self = this;
    mapApiLoad(function () {
      self._cache[key] = ymaps.templateLayoutFactory.createClass(template, overadice);
    });
  };
}]).directive('yaTemplateLayout', ['templateLayoutFactory', function (templateLayoutFactory) {
  return {
    restrict: 'E',
    priority: 1001,
    scope: {
      overrides: '=yaOverrides'
    },
    compile: function (tElement) {
      var html = tElement.html();
      tElement.children().remove();
      return function (scope, elm, attrs) {
        if (!attrs.yaKey) {
          throw new Error('not require attribute "key"');
        }
        var key = attrs.yaKey;
        templateLayoutFactory.create(key, html, scope.overrides);
      };
    }
  };
}]).controller('YaMapCtrl', ['$scope', 'mapApiLoad', YaMapCtrl]).directive('yaMap', ['$compile', 'mapApiLoad', '$window', 'yaSubscriber', '$parse', '$q', '$timeout', function ($compile, mapApiLoad, $window, yaSubscriber, $parse, $q, $timeout) {
  return {
    restrict: 'E',
    scope: {
      yaCenter: '@',
      yaType: '@',
      waitForCenter: '@',
      yaBeforeInit: '&',
      yaAfterInit: '&'
    },
    compile: function (tElement) {
      tElement.attr('style', 'display:block;height:100%;width:100%;');
      var childNodes = tElement.children(),
        centerCoordinatesDeferred = null;
      tElement.children().remove();
      return function (scope, element, attrs) {
        var getEvalOrValue = function (value) {
          try {
            return scope.$eval(value);
          } catch (e) {
            return value;
          }
        };
        var getCenterCoordinates = function (center) {
          if (centerCoordinatesDeferred)
            centerCoordinatesDeferred.reject();
          centerCoordinatesDeferred = $q.defer();
          if (!center) {
            console.log('no-center');
            // устанавливаем в качестве центра местоположение пользователя
            mapApiLoad(function () {
              console.log('ymaps.geolocation.get');
              ymaps.geolocation.get({
                // Выставляем опцию для определения положения по ip
                provider: 'yandex'//,
                // Карта автоматически отцентрируется по положению пользователя.
                //mapStateAutoApply: true
              }).then(function (result) {
                $timeout(function () {
                  console.log('ymaps.geolocation.get recieved');
                  centerCoordinatesDeferred.resolve(result.geoObjects.position);
                });
              }, function (error) {
                console.log('error defining center');
                console.log(error);
                $timeout(function () {
                  centerCoordinatesDeferred.resolve([37.617499, 55.752023]);
                });
              });
            });
          } else if (angular.isArray(center)) {
            $timeout(function () {
              centerCoordinatesDeferred.resolve(center);
            });
          } else if (angular.isString(center)) {
            console.warn('String warning');
            //проводим обратное геокодирование
            mapApiLoad(function () {
              ymaps.geocode(center, {results: 1}).then(function (res) {
                var firstGeoObject = res.geoObjects.get(0);
                scope.$apply(function () {
                  centerCoordinatesDeferred.resolve(firstGeoObject.geometry.getCoordinates());
                });
              }, function (err) {
                scope.$apply(function () {
                  centerCoordinatesDeferred.reject(err);
                });
              });
            });
          }
          return centerCoordinatesDeferred.promise;
        };
        var zoom = Number(attrs.yaZoom),
          behaviors = attrs.yaBehaviors ? attrs.yaBehaviors.split(' ') : ['default'];
        var controls = ['default'];
        if (attrs.yaControls) {
          controls = attrs.yaControls.split(' ');
        } else if (angular.isDefined(attrs.yaControls)) {
          controls = [];
        }
        var disableBehaviors = [], enableBehaviors = [], behavior;
        for (var i = 0, ii = behaviors.length; i < ii; i++) {
          behavior = behaviors[i];
          if (behavior[0] === '-') {
            disableBehaviors.push(behavior.substring(1));
          } else {
            enableBehaviors.push(behavior);
          }
        }

        if (zoom < 0) {
          zoom = 0;
        } else if (zoom > 23) {
          zoom = 23;
        }

        var mapPromise;
        var mapInit = function (center) {
          console.log('mapInit', center);
          var deferred = $q.defer();
          mapApiLoad(function () {
            scope.yaBeforeInit();
            var options = attrs.yaOptions ? scope.$eval(attrs.yaOptions) : undefined;
            if (options && options.projection) {
              options.projection = new ymaps.projection[options.projection.type](options.projection.bounds);
            }
            scope.map = new ymaps.Map(element[0], {
              center: center,
              zoom: zoom,
              controls: controls,
              type: attrs.yaType || 'yandex#map',
              behaviors: enableBehaviors
            }, options);
            scope.map.behaviors.disable(disableBehaviors);
            //подписка на события
            for (var key in attrs) {
              if (key.indexOf('yaEvent') === 0) {
                var parentGet = $parse(attrs[key]);
                yaSubscriber.subscribe(scope.map, parentGet, key, scope);
              }
            }
            deferred.resolve(scope.map);
            scope.yaAfterInit({$target: scope.map});
            element.append(childNodes);
            setTimeout(function () {
              scope.$apply(function () {
                $compile(element.children())(scope.$parent);
              });
            });
          });
          return deferred.promise;
        };

        scope.$watch('yaCenter', function (newValue) {
          console.log('yaCenter', newValue);
          if (newValue) {
            var center = getEvalOrValue(newValue);
            getCenterCoordinates(center).then(
              function (coords) {
                if (!mapPromise) {
                  mapPromise = mapInit(coords);
                  var isInit = true;
                }
                mapPromise.then(
                  function (map) {
                    if (!isInit) {
                      map.setCenter(coords);
                    }
                  }
                );
              }
            );
          } else {
            console.warn('You should define ya-center attribute or just wait for its initialization')
          }
          /*if(_center){
              setCenter(function(){
                  scope.map.setCenter(_center);
              });
          }*/
        });
        scope.$watch('yaType', function (newValue) {
          if (newValue && mapPromise) {
            mapPromise.then(
              function (map) {
                map.setType(newValue);
              }
            );
          }
        });

        scope.$on('$destroy', function () {
          if (scope.map) {
            scope.map.destroy();
          }
        });
      };
    },
    controller: 'YaMapCtrl'
  };
}]).directive('yaControl', ['yaSubscriber', 'templateLayoutFactory', '$parse', function (yaSubscriber, templateLayoutFactory, $parse) {
  return {
    restrict: 'E',
    require: '^yaMap',
    scope: {
      yaAfterInit: '&'
    },
    link: function (scope, elm, attrs, yaMap) {
      var className = attrs.yaType[0].toUpperCase() + attrs.yaType.substring(1);
      var getEvalOrValue = function (value) {
        try {
          return scope.$eval(value);
        } catch (e) {
          return value;
        }
      };
      var params = getEvalOrValue(attrs.yaParams);
      var options = attrs.yaOptions ? scope.$eval(attrs.yaOptions) : undefined;
      if (options && options.layout) {
        options.layout = templateLayoutFactory.get(options.layout);
      }
      if (options && options.itemLayout) {
        options.itemLayout = templateLayoutFactory.get(options.itemLayout);
      }
      if (params && params.items) {
        var items = [];
        var item;
        for (var i = 0, ii = params.items.length; i < ii; i++) {
          item = params.items[i];
          items.push(new ymaps.control.ListBoxItem(item));
        }
        params.items = items;
      }
      var obj = new ymaps.control[className](params);
      for (var key in options) {
        if (options.hasOwnProperty(key)) {
          obj.options.set(key, options[key]);
        }
      }
      //подписка на события
      for (key in attrs) {
        if (key.indexOf('yaEvent') === 0) {
          var parentGet = $parse(attrs[key]);
          yaSubscriber.subscribe(obj, parentGet, key, scope);
        }
      }
      yaMap.addControl(obj, options);
      scope.yaAfterInit({$target: obj});
    }
  };
}]).controller('CollectionCtrl', ['$scope', CollectionCtrl]).directive('yaCollection', ['$compile', '$timeout', 'yaSubscriber', '$parse',
  function ($compile, $timeout, yaSubscriber, $parse) {
    return {
      require: '^yaMap',
      restrict: 'E',
      scope: {
        yaAfterInit: '&'
      },
      compile: function (tElement) {
        var childNodes = tElement.contents();
        tElement.children().remove();
        return function (scope, element, attrs, yaMap) {
          var options = attrs.yaOptions ? scope.$eval(attrs.yaOptions) : {};

          var showAll = angular.isDefined(attrs.showAll) && attrs.showAll != 'false';
          if (showAll) {
            var map = yaMap.getMap();
            var timeout;
            var addEventHandler = function () {
              if (timeout) {
                $timeout.cancel(timeout);
              }
              timeout = $timeout(function () {
                map.geoObjects.events.remove('add', addEventHandler);
                var bounds = map.geoObjects.getBounds();
                if (bounds) {
                  map.setBounds(bounds, {checkZoomRange: true});
                }
              }, 300);
            };
            map.geoObjects.events.add('add', addEventHandler);
          }
          scope.collection = new ymaps.GeoObjectCollection({}, options);
          //подписка на события
          for (var key in attrs) {
            if (key.indexOf('yaEvent') === 0) {
              var parentGet = $parse(attrs[key]);
              yaSubscriber.subscribe(scope.collection, parentGet, key, scope);
            }
          }

          yaMap.addGeoObjects(scope.collection);
          scope.yaAfterInit({$target: scope.collection});
          scope.$on('$destroy', function () {
            if (scope.collection) {
              yaMap.removeGeoObjects(scope.collection);
            }
          });
          element.append(childNodes);
          $compile(element.children())(scope.$parent);
        };
      },
      controller: 'CollectionCtrl'
    };
  }]).directive('yaCluster', ['yaSubscriber', '$compile', 'templateLayoutFactory', '$parse', function (yaSubscriber, $compile, templateLayoutFactory, $parse) {
  return {
    require: '^yaMap',
    restrict: 'E',
    scope: {
      yaAfterInit: '&'
    },
    compile: function (tElement) {
      var childNodes = tElement.contents();
      tElement.children().remove();
      return function (scope, element, attrs, yaMap) {
        var collectionOptions = attrs.yaOptions ? scope.$eval(attrs.yaOptions) : {};
        if (collectionOptions && collectionOptions.clusterBalloonItemContentLayout) {
          collectionOptions.clusterBalloonItemContentLayout =
            templateLayoutFactory.get(collectionOptions.clusterBalloonItemContentLayout);
        }
        if (collectionOptions && collectionOptions.clusterBalloonContentLayout) {
          collectionOptions.clusterBalloonContentLayout =
            templateLayoutFactory.get(collectionOptions.clusterBalloonContentLayout);
        }
        //включение кластеризации
        scope.collection = new ymaps.Clusterer(collectionOptions);
        //подписка на события
        for (var key in attrs) {
          if (key.indexOf('yaEvent') === 0) {
            var parentGet = $parse(attrs[key]);
            yaSubscriber.subscribe(scope.collection, parentGet, key, scope);
          }
        }

        yaMap.addGeoObjects(scope.collection);
        scope.yaAfterInit({$target: scope.collection});
        scope.$on('$destroy', function () {
          if (scope.collection) {
            yaMap.removeGeoObjects(scope.collection);
          }
        });
        element.append(childNodes);
        $compile(element.children())(scope.$parent);
      };
    },
    controller: 'CollectionCtrl'
  };
}]).directive('yaGeoObject', ['GEOMETRY_TYPES', 'yaSubscriber', 'templateLayoutFactory', '$parse', function (GEOMETRY_TYPES, yaSubscriber, templateLayoutFactory, $parse) {
  return {
    restrict: 'E',
    require: ['^yaMap', '?^yaCollection', '?^yaCluster'],
    scope: {
      yaSource: '=',
      yaShowBalloon: '=',
      yaAfterInit: '&'
    },
    link: function (scope, elm, attrs, ctrls) {
      var ctrl = ctrls[2] || ctrls[1] || ctrls[0],
        obj;
      var options = attrs.yaOptions ? scope.$eval(attrs.yaOptions) : undefined;
      if (options && options.balloonContentLayout) {
        options.balloonContentLayout = templateLayoutFactory.get(options.balloonContentLayout);
      }
      if (options && options.iconLayout) {
        options.iconLayout = templateLayoutFactory.get(options.iconLayout);
      }
      var createGeoObject = function (from, options) {
        if (from.geometry.type === 'Arrow') {
          options = options || {};
          options.editorMenuManager = function (items) {
            items.push({
              title: "Удалить линию",
              onClick: function () {
                ctrl.removeGeoObjects(obj);
              }
            });
            return items;
          };
          obj = new ymaps.Arrow(from.geometry.coordinates, null, options);
        } else {
          obj = new ymaps.GeoObject(from, options);
        }
        //подписка на события
        for (var key in attrs) {
          if (key.indexOf('yaEvent') === 0) {
            var parentGet = $parse(attrs[key]);
            yaSubscriber.subscribe(obj, parentGet, key, scope);
          }
        }
        ctrl.addGeoObjects(obj);
        scope.yaAfterInit({$target: obj});
        checkEditing(attrs.yaEdit);
        checkDrawing(attrs.yaDraw);
        checkShowBalloon(scope.yaShowBalloon);
      };
      scope.$watch('yaSource', function (newValue) {
        if (newValue) {
          if (obj) {
            obj.geometry.setCoordinates(newValue.geometry.coordinates);
            if (obj.geometry.getType() === GEOMETRY_TYPES.CIRCLE) {
              obj.geometry.setRadius(newValue.geometry.radius);
            }
            var properties = newValue.properties;
            for (var key in properties) {
              if (properties.hasOwnProperty(key)) {
                obj.properties.set(key, properties[key]);
              }
            }
          } else {
            createGeoObject(newValue, options);
          }
        } else if (obj) {
          ctrl.removeGeoObjects(obj);
        }
      }, angular.equals);
      var checkEditing = function (editAttr) {
        if (angular.isDefined(editAttr) && editAttr !== 'false') {
          if (obj) {
            obj.editor.startEditing()
          }
        } else if (angular.isDefined(editAttr)) {
          if (obj) {
            obj.editor.stopEditing();
          }
        }
      };
      var checkDrawing = function (drawAttr) {
        if (angular.isDefined(drawAttr) && drawAttr !== 'false') {
          if (obj) {
            obj.editor.startDrawing()
          }
        } else if (angular.isDefined(drawAttr)) {
          if (obj) {
            obj.editor.stopDrawing();
          }
        }
      };
      var checkShowBalloon = function (newValue) {
        if (newValue) {
          if (obj) {
            obj.balloon.open();
          }
        } else {
          if (obj) {
            obj.balloon.close();
          }
        }
      };
      attrs.$observe('yaEdit', checkEditing);
      attrs.$observe('yaDraw', checkDrawing);
      scope.$watch('yaShowBalloon', checkShowBalloon);
      scope.$on('$destroy', function () {
        if (obj) {
          ctrl.removeGeoObjects(obj);
        }
      });
    }
  };
}]).directive('yaHotspotLayer', [function () {
  return {
    restrict: 'E',
    require: '^yaMap',
    link: function (scope, elm, attrs, yaMap) {
      if (!attrs.yaUrlTemplate) {
        throw new Error('not exists required attribute "url-template"');
      }
      if (!attrs.yaKeyTemplate) {
        throw new Error('not exists required attribute "key-template"');
      }
      var options = attrs.yaOptions ? scope.$eval(attrs.yaOptions) : undefined;
      yaMap.addHotspotLayer(attrs.yaUrlTemplate, attrs.yaKeyTemplate, options);
    }
  }
}]).directive('yaImageLayer', [function () {
  return {
    restrict: 'E',
    require: '^yaMap',
    link: function (scope, elm, attrs, yaMap) {
      if (!attrs.yaUrlTemplate) {
        throw new Error('not exists required attribute "url-template"');
      }
      var options = attrs.yaOptions ? scope.$eval(attrs.yaOptions) : undefined;
      yaMap.addImageLayer(attrs.yaUrlTemplate, options);
    }
  }
}]).directive('yaDragger', ['yaSubscriber', '$parse', 'mapApiLoad', function (yaSubscriber, $parse, mapApiLoad) {
  return {
    restrict: 'EA',
    scope: {
      yaAfterInit: '&'
    },
    link: function (scope, elm, attrs) {
      var options = attrs.yaOptions ? scope.$eval(attrs.yaOptions) : {};
      mapApiLoad(function () {
        options.autoStartElement = elm[0];
        var obj = new ymaps.util.Dragger(options);
        //подписка на события
        for (var key in attrs) {
          if (key.indexOf('yaEvent') === 0) {
            var parentGet = $parse(attrs[key]);
            yaSubscriber.subscribe(obj, parentGet, key, scope);
          }
        }
        scope.yaAfterInit({$target: obj});
      });
    }
  };
}]);

function defineArrow() {
  /**
   * Class for creating an arrow on the map.
   * It is a helper for creating a polyline with a special overlay.
   * When using the modules in a real project, we recommend placing them in separate files.
   */
  ymaps.modules.define("geoObject.Arrow", [
    'Polyline',
    'overlay.Arrow',
    'util.extend'
  ], function (provide, Polyline, ArrowOverlay, extend) {
    /**
     * @param {Number[][] | Object | ILineStringGeometry} geometry Geometry of the polyline.
     * @param {Object} properties Polyline data.
     * @param {Object} options Polyline options.
     * Supports the same set of options as the ymaps.Polyline class.
     * @param {Number} [options.arrowAngle=20] Angle in degrees between the main line and the lines of the arrow.
     * @param {Number} [options.arrowMinLength=3] Minimum length of the arrow. If the length of the arrow is less than the minimum value, the arrow is not drawn.
     * @param {Number} [options.arrowMaxLength=20] Maximum length of the arrow.
     */
    var Arrow = function (geometry, properties, options) {
      return new Polyline(geometry, properties, extend({}, options, {
        lineStringOverlay: ArrowOverlay
      }));
    };
    provide(Arrow);
  });

  /**
   * Class that implements the IOverlay interface.
   * Gets the pixel geometry of the line as input and adds an arrow at the end of the line.
   */
  ymaps.modules.define("overlay.Arrow", [
    'overlay.Polygon',
    'util.extend',
    'event.Manager',
    'option.Manager',
    'Event',
    'geometry.pixel.Polygon'
  ], function (provide, PolygonOverlay, extend, EventManager, OptionManager, Event, PolygonGeometry) {
    var domEvents = [
        'click',
        'contextmenu',
        'dblclick',
        'mousedown',
        'mouseenter',
        'mouseleave',
        'mousemove',
        'mouseup',
        'multitouchend',
        'multitouchmove',
        'multitouchstart',
        'wheel'
      ],

      /**
       * @param {geometry.pixel.Polyline} pixelGeometry The line's pixel geometry.
       * @param {Object} data The overlay data.
       * @param {Object} options Overlay options.
       */
      ArrowOverlay = function (pixelGeometry, data, options) {
        // The .events and .options fields are mandatory for IOverlay.
        this.events = new EventManager();
        this.options = new OptionManager(options);
        this._map = null;
        this._data = data;
        this._geometry = pixelGeometry;
        this._overlay = null;
      };

    ArrowOverlay.prototype = extend(ArrowOverlay.prototype, {
      // Implementing all the methods and events that the IOverlay interface requires.
      getData: function () {
        return this._data;
      },

      setData: function (data) {
        if (this._data != data) {
          var oldData = this._data;
          this._data = data;
          this.events.fire('datachange', {
            oldData: oldData,
            newData: data
          });
        }
      },

      getMap: function () {
        return this._map;
      },

      setMap: function (map) {
        if (this._map != map) {
          var oldMap = this._map;
          if (!map) {
            this._onRemoveFromMap();
          }
          this._map = map;
          if (map) {
            this._onAddToMap();
          }
          this.events.fire('mapchange', {
            oldMap: oldMap,
            newMap: map
          });
        }
      },

      setGeometry: function (geometry) {
        if (this._geometry != geometry) {
          var oldGeometry = geometry;
          this._geometry = geometry;
          if (this.getMap() && geometry) {
            this._rebuild();
          }
          this.events.fire('geometrychange', {
            oldGeometry: oldGeometry,
            newGeometry: geometry
          });
        }
      },

      getGeometry: function () {
        return this._geometry;
      },

      getShape: function () {
        return null;
      },

      isEmpty: function () {
        return false;
      },

      _rebuild: function () {
        this._onRemoveFromMap();
        this._onAddToMap();
      },

      _onAddToMap: function () {
        /**
         * As a trick to get self-intersections drawn correctly in a transparent polyline,
         * we draw a polygon instead of a polyline.
         * Each contour of the polygon will be responsible for a section of the line.
         */
        this._overlay = new PolygonOverlay(new PolygonGeometry(this._createArrowContours()));
        this._startOverlayListening();
        /**
         * This string will connect the two options managers.
         * Options specified in the parent manager
         * will be propagated to the child.
         */
        this._overlay.options.setParent(this.options);
        this._overlay.setMap(this.getMap());
      },

      _onRemoveFromMap: function () {
        this._overlay.setMap(null);
        this._overlay.options.setParent(null);
        this._stopOverlayListening();
      },

      _startOverlayListening: function () {
        this._overlay.events.add(domEvents, this._onDomEvent, this);
      },

      _stopOverlayListening: function () {
        this._overlay.events.remove(domEvents, this._onDomEvent, this);
      },

      _onDomEvent: function (e) {
        /**
         * We listen to events from the child service overlay and
         * throw them on an external class.
         * This is to ensure that the  "target" field was correctly defined
         * in the event.
         */
        this.events.fire(e.get('type'), new Event({
          target: this
          /**
           * Linking the original event with the current one,
           * so that all of the data fields of child events are accessible in a derived event.
           */
        }, e));
      },

      _createArrowContours: function () {
        var contours = [],
          mainLineCoordinates = this.getGeometry().getCoordinates(),
          arrowLength = calculateArrowLength(
            mainLineCoordinates,
            this.options.get('arrowMinLength', 3),
            this.options.get('arrowMaxLength', 20)
          );
        contours.push(getContourFromLineCoordinates(mainLineCoordinates));
        // We will draw the arrow only if the line length is not less than the length of the arrow.
        if (arrowLength > 0) {
          // Creating 2 more contours for arrows.
          var lastTwoCoordinates = [
              mainLineCoordinates[mainLineCoordinates.length - 2],
              mainLineCoordinates[mainLineCoordinates.length - 1]
            ],
            /**
             * For convenience of calculation, we will rotate the arrow so that it is pointing along the y axis,
             * and then turn the results back.
             */
            rotationAngle = getRotationAngle(lastTwoCoordinates[0], lastTwoCoordinates[1]),
            rotatedCoordinates = rotate(lastTwoCoordinates, rotationAngle),

            arrowAngle = this.options.get('arrowAngle', 20) / 180 * Math.PI,
            arrowBeginningCoordinates = getArrowsBeginningCoordinates(
              rotatedCoordinates,
              arrowLength,
              arrowAngle
            ),
            firstArrowCoordinates = rotate([
              arrowBeginningCoordinates[0],
              rotatedCoordinates[1]
            ], -rotationAngle),
            secondArrowCoordinates = rotate([
              arrowBeginningCoordinates[1],
              rotatedCoordinates[1]
            ], -rotationAngle);

          contours.push(getContourFromLineCoordinates(firstArrowCoordinates));
          contours.push(getContourFromLineCoordinates(secondArrowCoordinates));
        }
        return contours;
      }
    });

    function getArrowsBeginningCoordinates(coordinates, arrowLength, arrowAngle) {
      var p1 = coordinates[0],
        p2 = coordinates[1],
        dx = arrowLength * Math.sin(arrowAngle),
        y = p2[1] - arrowLength * Math.cos(arrowAngle);
      return [[p1[0] - dx, y], [p1[0] + dx, y]];
    }

    function rotate(coordinates, angle) {
      var rotatedCoordinates = [];
      for (var i = 0, l = coordinates.length, x, y; i < l; i++) {
        x = coordinates[i][0];
        y = coordinates[i][1];
        rotatedCoordinates.push([
          x * Math.cos(angle) - y * Math.sin(angle),
          x * Math.sin(angle) + y * Math.cos(angle)
        ]);
      }
      return rotatedCoordinates;
    }

    function getRotationAngle(p1, p2) {
      return Math.PI / 2 - Math.atan2(p2[1] - p1[1], p2[0] - p1[0]);
    }

    function getContourFromLineCoordinates(coords) {
      var contour = coords.slice();
      for (var i = coords.length - 2; i > -1; i--) {
        contour.push(coords[i]);
      }
      return contour;
    }

    function calculateArrowLength(coords, minLength, maxLength) {
      var linePixelLength = 0;
      for (var i = 1, l = coords.length; i < l; i++) {
        linePixelLength += getVectorLength(
          coords[i][0] - coords[i - 1][0],
          coords[i][1] - coords[i - 1][1]
        );
        if (linePixelLength / 3 > maxLength) {
          return maxLength;
        }
      }
      var finalArrowLength = linePixelLength / 3;
      return finalArrowLength < minLength ? 0 : finalArrowLength;
    }

    function getVectorLength(x, y) {
      return Math.sqrt(x * x + y * y);
    }

    provide(ArrowOverlay);
  });
}