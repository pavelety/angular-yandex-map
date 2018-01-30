yaMap
==========

**yaMap** Модуль для легкой работы с Яндекс картами в приложениях AngularJS.

Версии Яндекс карт
-----
В настоящий момент поддерживаются 2 версии яндекс карт, 2.0 и 2.1.

Установка
-----
1. Добавьте ссылку на файл ya-map-2.1.js, в зависимости от требуемой версии, в файл вашего главного представления.

   Некоторые провайдеры (замечено на Теле2) блокировали загрузку скрипта через document.createElement("script"), надо добавлять в index.html.
   ```html
   <script src="js/ya-map-2.1.js"></script>
   <script src="//api-maps.yandex.ru/2.1/?load=package.full&lang=ru_RU&coordorder=longlat&onload=onYaMapLoad" type="text/javascript"></script>
   ```
2. Задайте для вашего приложения зависимость от модуля yaMap:

   ```javascript
   var app = angular.module('myApp', ['yaMap']);
   ```

3. Задайте предпочитаемый язык и расположение коодинат в массиве, изменив при необходимости значения в `yaMapSettings`. В версии 2.1 `yaMapSettings` является провайдером, и его опции можно устанавливать через `app.config` используя методы `setLanguage`,`setOrder`.
4. Не забудьте установить размеры для контейнера карты, иначе ничего не увидите.

Примеры
-----
Практически все примеры из [песочницы яндекс карт](http://api.yandex.ru/maps/jsbox/2.1/) воспроизведены на [демонстрационной странице](http://tulov-alex.ru/). Если примеры не воспроизведены, скорее всего задачи примера решаются гораздо проще средствами angular. Например, отображение меток в зависимости от каких либо параметров легко реализовать используя фильтры.

В каталоге example содержаться исходные коды примеров, разбитые по версиям API Yandex map. Если вы хотите запустить их на локальном компьютере (все равно требуется подключение к интернет для работы с картами), вам нужно сделать следующее:

    1 запустить bower install в корневой папке проекта
    2 запустить node web-server.js находясь в папке с примерами.
    3 ввести в браузере: localhost: 8000


----------

Поддержка событий
-----
Реализована поддержка для всех событий. Чтобы подписаться на любое событие нужно определить атрибут с `ya-event[-object]-eventname`, где вместо `eventname` нужно подставить имя события, а вместо `object`, если необходимо, то подставить имя свойства, на событие которого подписываемся. Например `ya-event-click` - для подписки на событие `click`, или `ya-event-geo-objects-add` - для подписки на событие `add` для `map.geoObjects`.

Работать с ними нужно так же, как и с встроенными директивами событий, такими как `ng-click`.
Чтобы получить родной объект события используйте `$event`. Получить объект, породивший событие можно через `$event.get('target')`
Соответственно события нужно определять в той директиве, к которой они относятся, например события карты в `yaMap`.

Директива yaMap (обе версии)
-----
Представляет карту на вашей странице. Именно в ней должны располагаться практически все остальные директивы.

Атрибуты:

 - `ya-center` - выражение, которое должно возвращать массив координат, или строку адреса. Если не задан, тогда определяется текущее местоположение пользователя и используется в качестве центра.
 - `ya-zoom` - массштаб карты, по умолчанию 0. Диапазон от 0-23 включительно. 0 самый мелкий (вся земля).
 - `ya-controls` - (версия 2.1) задает контролы на карте. Если контролы не нужны `ya-controls=""`. Если не задан, тогда отображаются контролы по умолчанию.
 - `ya-type` - тип карты, возможные значения:

        yandex#map (схема) - по умолчанию;
        yandex#satellite (спутник);
        yandex#hybrid (гибрид);
        yandex#publicMap (народная карта);
        yandex#publicMapHybrid (гибрид народной карты)
 - `ya-behaviors` - поведения карты, задается в виде строки с разделительным пробелом между значениями. По умолчанию - `default`. Чтобы удалить какие-либо поведения, нужно поставить перед их именем знак "-". Доступные значения:

            "default" — короткий 	синоним для включения/отключения поведений карты по умолчанию:
                для настольных браузеров - "drag", "dblClickZoom", "rightMouseButtonMagnifier",
                для мобильных - "drag", "dblClickZoom" и "multiTouch"
            "drag" — перемещание 	карты при нажатой левой кнопке мыши либо одиночным касанием;
            "scrollZoom" — изменение масштаба колесом мыши
            "dblClickZoom" — масштабирование карты двойным щелчком кнопки мыши
            "multiTouch" — масштабирование карты двойным касанием (например, пальцами на сенсорном экране)
            "rightMouseButtonMagnifier" — увеличение области, выделенной правой кнопкой мыши (только для настольных браузеров)
            "leftMouseButtonMagnifier" — увеличение области, выделенной левой кнопкой мыши либо одиночным касанием
            "ruler" — измерение 	расстояния
            "routeEditor" — редактор маршрутов
 - `ya-options` - опции карты. При задании опции `projection` используется следующий формат:
        `projection:{type:'Cartesian', bounds:[[-1, -1],[1, 1]]}`, где `type` - задает класс для создания проекции, а `bounds` - координаты ограничивающего прямоугольника проекции. Остальные опции задаются как обычно.
    `ya-before-init` - задает функцию, которая будет выполнена после подготовки api карт, но до создания самой карты.
    `ya-after-init` - задает функцию, которая будет выполнена после создания объекта карты. Чтобы получить сам объект карты,используйте `$target`.

Директива yaToolbar (только в версии 2.0)
-----
Представляет набор элементов управления на карте. Обязательно должна находится в yaMap. 

Возможные атрибуты:

 - `ya-name` - обязательный. Задает имя контрола для отображения. Доступные значения: `'zoomControl'`,`'typeSelector'`,`'mapTools'`,`'scaleLine'`,`'miniMap'`,`'searchControl'`, `'trafficControl'` и `'smallZoomControl'`.
 - `ya-options` - выражение, которое должно возвращать объект с настройками для контрола. По умолчанию не установлено.
 - `ya-params` - параметры создания контрола. по умолчанию не установлены.
 - `ya-after-init` - задает функцию, которая будет выполнена после создания объекта. Чтобы получить сам объект,используйте `$target`.

Директива yaControl (в обеих версиях)
-----
Представляет элемент управления на карте. В версии 2.0 должна стоять внутри `yaToolbar`, в 2.1 внутри `yaMap`. 

Атрибуты:

 - `ya-type` - тип создаваемого элемента управления.
 - `ya-params` - параметры элемента управления
 - `ya-after-init` - задает функцию, которая будет выполнена после создания объекта. Чтобы получить сам объект,используйте `$target`.

Директива yaCollection (в обеих версиях)
-----
представляет коллекцию гео.объектов. Должна находиться внутри `yaMap`. 

Атрибуты:

 - `ya-options` - задает настройки отображения объектов для всей коллекции. По умолчанию `{}`.
 - `ya-show-all` - подстраивать масштаб карты и ее центр при первом отображении, для того чтобы отображались все доступные гео.объекты. По умолчанию: `false`
 - `ya-after-init` - задает функцию, которая будет выполнена после создания объекта. Чтобы получить сам объект,используйте `$target`.

Директиа yaGeoObject (в обеих версиях)
-----
представляет гео. объект карты. Должна стоять в `yaMap` или `yaCollection`, или `yaCluster`. 

Атрибуты:

 - `ya-source` - задает источник данных для гео. объекта.
 - `ya-options` - задает настройки отображения для конкретного гео. объекта.
 - `ya-edit` - если задан, переводит объект в режим редактирования
 - `ya-draw` - если задан, переводит объект в режим рисования.
 - `ya-show-balloon` - выражение, если оно возвращает true, то балун будет открыт, иначе закрыт.
 - `ya-after-init` - задает функцию, которая будет выполнена после создания объекта. Чтобы получить сам объект,используйте `$target`.

Директива yaImageLayer (в обеих версиях)
-----
Представляет собой картиночный слой карты. Должна находиться в yaMap. 

Имеет атрибуты:

 - `ya-url-template` - шаблон URL тайлов картиночного слоя. Обязательный атрибут
 - `ya-options` - настройка отображения слоя на карте. Не обязательный атрибут.

Директива yaHotspotLayer (в обеих версиях)
-----
Представляет собой активный слой карты. Должна находиться в yaMap. 

Имеет атрибуты:

 - `ya-url-template` - Шаблон URL для данных активных областей. Обязательный атрибут.
 - `ya-key-template` - Шаблон callback-функции, в которую сервер будет оборачивать данные тайла. Обязательный атрибут.
 - `ya-options` - настройки отображения слоя на карте. Не обязательный атрибут.

Директива yaCluster (в обеих версиях)
-----
Представляет кластеризатор карты. Должна находиться в `yaMap`. 

Имеет атрибуты:

 - `ya-options` - задает опции для кластера.
 - `ya-after-init` - задает функцию, которая будет выполнена после создания объекта. Чтобы получить сам объект,используйте `$target`.

Директива yaTemplateLayout (в обеих версиях)
-----
Представляет собой HTML шаблон, который должен использоваться элементами карты. Должна определяться до использования соответствующего шаблона.

Имеет атрибуты:

 - `ya-key` - ключ для дальнейшего обращения к шаблону
 - `ya-overrides` - объект, который задает переопределяемые функции.

Директива yaDragger (в версии 2.1)
-----
Представляет собой перетаскиваемый на карту элемент управления. 

Contribute
-----
npm i
npm i -g grunt-cli
grunt