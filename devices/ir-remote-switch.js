let Service, Characteristic;

MiRemoteSwitch = function(platform, config) {
  const {ip} = config;
  this.platform = platform;
  this.config = config;
  this.platform.log.debug(`[MiRemoteSwitch]Initializing MiRemoteSwitch: ${ip}`);
  return new MiRemoteSwitchService(this);
};

class MiRemoteSwitchService {
  constructor({config, platform}) {
    const {name, ip, token, data, keepalive = false} = config;
    this.name = name;
    this.token = token;
    this.data = data;
    this.keepalive = keepalive;
    this.platform = platform;

    this.readydevice = false;
    this.device = platform.getMiioDevice(
      {
        address: ip,
        token
      },
      this
    );

    Service = platform.HomebridgeAPI.hap.Service;
    Characteristic = platform.HomebridgeAPI.hap.Characteristic;

    this.onoffstate = false;
    
    if (this.keepalive) {
      var self = this;
      setInterval(function() {
        self.platform.log.debug("IR Remote Switch keep alive");
        self.device.call("miIO.ir_play", { freq: 38400, code: 'dummy' })
          .then(result => { self.platform.log.debug("SUCCESS"); })
          .catch(res => { self.platform.log.debug("FAIL"); })
        }, 60*1000);
      }
  
  }

  getServices() {
    var self = this;
    const serialNumber = this.token.substring(this.token.length - 8);
    const infoService = new Service.AccessoryInformation();
    infoService
      .setCharacteristic(Characteristic.Manufacturer, "XiaoMi")
      .setCharacteristic(Characteristic.Model, "MiIRRemote-Switch")
      .setCharacteristic(Characteristic.SerialNumber, serialNumber);
    const MiRemoteSwitchServices = new Service.Switch(this.name);
    const MiRemoteSwitchServicesCharacteristic = MiRemoteSwitchServices.getCharacteristic(Characteristic.On);
    MiRemoteSwitchServicesCharacteristic.on(
      "set",
      function(value, callback) {
        if (this.readydevice) {
          const onoff = value ? "on" : "off";
          this.onoffstate = value;
          this.device
            .call("miIO.ir_play", {freq: 38400, code: this.data[onoff]})
            .then(() => {
              self.platform.log.debug(`[MiIRRemote][${this.name}]Switch: ${onoff}`);
              callback(null);
            })
            .catch(function(err) {
              self.platform.log.error(`[MiIRRemote][${this.name}][ERROR]Switch Error: ${err}`);
              callback(err);
            });
        } else {
          self.platform.log.info(`[${this.name}]Switch: Unready`);
          callback(null);
        }
      }.bind(this)
    ).on(
      "get",
      function(callback) {
        callback(null, this.onoffstate);
      }.bind(this)
    );

    return [infoService, MiRemoteSwitchServices];
  }
}
