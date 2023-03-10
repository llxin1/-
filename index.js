/**
 * 发布订阅者模式
*/
let salesOffices = {} // 定义售楼处

salesOffices.clientList = {} // 通讯方式存放列表

salesOffices.listen = function(key, fn) {
  if(!this.clientList[key]) {
    this.clientList[key] = []
  }
  this.clientList[key].push(fn)
}

salesOffices.trigger = function() {
  const keys = Array.prototype.shift.call(arguments)
  const fns = this.clientList[keys]

  if(!fns || fns.length === 0) return

  this.clientList[keys].forEach(item => {
    item.apply(this, arguments)
  })
}

salesOffices.listen('小明', function(price, squareMeter) {
  console.log(`价格:${price}, 面积:${squareMeter}`);
})
salesOffices.listen('小红', function(price, squareMeter) {
  console.log(`价格：${price}, 面积：${squareMeter}`);
})

// salesOffices.trigger('小明', '100W', 88)
// salesOffices.trigger('小红','200W', 160)

// 通用模式
const event = {
  clientList: {},
  listen: function(key, fn) {
    if(!this.clientList[key]) {
      this.clientList[key] = []
    }
    this.clientList[key].push(fn)
  },
  trigger: function() {
    const keys = Array.prototype.shift.call(arguments)
    const fn = this.clientList[keys]

    if(!fn || fn.length === 0) return

    fn.forEach(item => {
      item.apply(this, arguments)
    })
  }
}

// 增加解除订阅模式
event.remove = function (key, fn) {
  const fns = this.clientList[key]
  if (!fns || fns.length === 0) return false
  if (!fn) {
    fns.length = 0
  } else {
    for (let i = (fns.length - 1); i >= 0; i--) {
      console.log(fns[i] == fn);
      if (fns[i] === fn) {
        fns.splice(i, 1)
      }
    }
  }
}

function installEvent(obj) {
  for (const key in event) {
    obj[key] = event[key]
  }
}

let carOffice = {}
installEvent(carOffice)

const fn1 = (model, price) => {
  console.log(`型号:${model}, 价格:${price}`);
}

const fn2 = (model, price, config) => {
  console.log(`型号:${model}, 价格:${price}, 配置：${config}`);
}


carOffice.listen('王', fn1)
carOffice.listen('王', fn2)
carOffice.listen('张', fn2)

// carOffice.remove('王', fn2)

// carOffice.trigger('王', 'TESLA-Model X', '101.89W')
// carOffice.trigger('张', 'AUDI S8', '209.89W', "V8")

// 🌰 -- 网站登陆
// 登陆状态的发布与订阅,登陆模块只发布登陆成功状态与获取的用户信息给每个需要订阅的模块

// 封装Event
class Event {
  static clientList = {}

  static listen(key, fn) {
    if(!this.clientList[key]) {
      this.clientList[key] = []
    }
    this.clientList[key].push(fn)
  }

  static trigger() {
    const keys = [...arguments].shift()
    const fns = this.clientList[keys]
    if(!fns || fns.length === 0) return
    fns.forEach(item => {
      item.apply(this, arguments)
    })
  }

  static remove(key, fn) {
    const fns = this.clientList[key]
    if (!fns || fns.length === 0) return
    if(!fn) {
      fns.length = 0
    } else {
      for (let i = fns.length - 1; i >= 0; i--) {
        if(fns[i] === fn) fns.splice(i, 1)
      }
    }
  } 
}

// Event.listen('xin', fn1)
// Event.listen('xin', fn2)
// Event.remove('xin', fn1)
// Event.trigger('xin', 'AUDI S8', '209.89W', "V8")

/**
 * 实现
 * 1. 先订阅后发布
 * 2. 命名空间
 * 
 * 使用listen时，调用create后在namespaceCache中创建一个 namespace的对象，用于存储一套订阅、发布、取消订阅方法，并订阅对应事件
 * 使用tirgger时，继续调用create，调用后先寻找是否有对应的命名空间，有则发布对应订阅事件。
*/

function Eventplus() {
  const global = this
  const _default = 'default'

  const Event = function() {
    const _slice = Array.prototype.slice
    const _shift = Array.prototype.shift
    const _unshift = Array.prototype.unshift
    let _listen, _trigger, _remove, _create, find
    let namespaceCache = {}

    const each = function(ary, fn) {
      let ret
      for (let i = 0; i < ary.length; i++) {
        const n = ary[i]
        ret = fn.call(n, i, n)
      }
      return ret
    }

    _listen = function(key, fn, cache) {
      if(!cache[key]) {
        cache[key] = []
      }
      cache[key].push(fn)
    }

    _remove = function(key, cache, fn) {
      if(cache[key]) {
        if(fn) {
          for (let i = cache[key].length - 1; i >= 0; i--) {
            if(cache[key][i] === fn) cache[key].splice(i, 1)
          }
        } else {
          cache[key] = []
        }
      }
    }

    _trigger = function() {
      const _self = this
      const cache = _shift.call(arguments) // 用两个shift从arguments连续去值
      const key = _shift.call(arguments)
      const args = arguments
      const stack = cache[key]
      let ret
      console.log(cache,"=", key, "=", args, '=', stack);
      if(!stack || !stack.length) return

      return each(stack, function() {
        return this.apply(_self, args)
      })
    }

    _create = function(namespace) {
      let nSpace = namespace || _default
      let cache = {}
      let offlineStack = []

      const ret = {
        listen: function(key, fn, last) {
          _listen(key, fn, cache)

          if(offlineStack === null) return
          if(last === 'last') {
            offlineStack.length&&offlineStack.pop()()
          } else {
            each(offlineStack, function() { 
              this()
            })
          }
          offlineStack = null
        },
        one: function(key, fn, last){
          _remove(key, cache)
          this.listen(key, fn, last)
        },
        remove: function(key, fn) {
          _remove(key, cache, fn);
        },
        trigger: function() {
          const _self = this
          let fn, args
          _unshift.call(arguments, cache)
          args = arguments
          fn = function() {
            return _trigger.apply(_self, args)
          }

          // 当需要先触发，先存进离线堆栈中
          if(offlineStack) {
            return offlineStack.push(fn)
          }
          return fn()
        }
      }
      return nSpace ? ( namespaceCache[nSpace] ? namespaceCache[nSpace] : namespaceCache[nSpace] = ret ) : ret
    }

    return {
      create: _create,
      one: function(key, fn, last) {
        let event = this.create()
        event.listen(key, fn, last)
      },
      trigger: function() {
        const event = this.create()
        event.trigger.apply(this, arguments)
      }
    }

  }

  return Event
}

const eventPlus = Eventplus()()
eventPlus.create( 'namespace1' ).listen('click', function( a ){ console.log( a ); // 输出:1
});
eventPlus.create( 'namespace1' ).trigger('click', 1);
