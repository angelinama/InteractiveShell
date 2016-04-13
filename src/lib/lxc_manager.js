var lxc_manager = function() {
  var options = {
      NEW_CONTAINERS_FILE: "lib/new_containers",
      OLD_CONTAINERS_FILE: "lib/old_containers",
      CONTAINER_SPLIT_SYMBOL: " *** ",
      ISOLATED_LEASES_FILE: "/var/lib/libvirt/dnsmasq/isolated.leases"
    },
    linuxContainerCollection = {},
    ipCollection = [];

  var removeIp = function(ip) {
    var split = options.CONTAINER_SPLIT_SYMBOL;
    var lxc_data = linuxContainerCollection[ip];
    var uuid = lxc_data[0];
    var macAddress = lxc_data[1];
    var newLine = uuid + split + macAddress + split + ip;
    console.log("I should be deleting " + ip + ", but I won't.");
    var fs = require('fs');
    fs.appendFile(options.OLD_CONTAINERS_FILE, newLine, function(err) {
      if (err) {
        console.log('Could not append to old containers file.');
      }
      console.log('Appended ' + newLine + ' to old containers file.');
    });
  };

  var getNewIp = function(next) {
    if (ipCollection.length > 5) {
      var ip = ipCollection.pop();
      next(ip);
    } else if (ipCollection.length > 1) {
      ip = ipCollection.pop();
      next(ip);
      readContainerList();
    } else {
      ip = ipCollection[0];
      readContainerList();
    }
  };

  var readContainerList = function() {
    var fs = require('fs');
    fs.readFile(options.NEW_CONTAINERS_FILE, function(error, containerList) {
      if (error) {
        console.log("Something went wrong while reading container list.");
      }
            // TODO: Catch error
      var fs = require('fs');
      fs.readFile(options.ISOLATED_LEASES_FILE, function(err, rawIpAddressTable) {
        var ipAddressTable = {};
        var lines = rawIpAddressTable.toString().split("\n");
        for (var index in lines) {
            var words = lines[index].split(" ");
            var macAddress = words[1];
            var ip = words[2];
            ipAddressTable[macAddress] = ip;
//                    if(ip){
//                        ipCollection.push(ip);
//                    }
          }
        addNewContainersToContainerCollection(containerList, ipAddressTable);
      });
    });
  };

  var addNewContainersToContainerCollection = function(containerList, ipAddressTable) {
    console.log(containerList);
    var lines = containerList.toString().split("\n");
    for (var index in lines) {
      var containerData = lines[index].split(options.CONTAINER_SPLIT_SYMBOL);
      var uuid = containerData[0];
      var macAddress = containerData[1];
      var addingFunction = function(uuid, macAddress) {
        return function(ip) {
            if (ip) {
                ipCollection.push(ip);
                linuxContainerCollection[ip] = [uuid, macAddress, ip];
              }
          };
      };
      getIPFromMacAddress(macAddress, ipAddressTable, addingFunction(uuid, macAddress));
    }
  };


  var getIPFromMacAddress = function(macAddress, ipAddressTable, next) {
    if (macAddress in ipAddressTable) {
      var ip = ipAddressTable[macAddress];
      next(ip);
    } else {
      var fs = require('fs');
      setTimeout(function() {
        var ipAddressTableFile = options.ISOLATED_LEASES_FILE;
        fs.readFile(ipAddressTableFile, function(err, rawIpAddressTable) {
            var ipAddressTable = {};
            var lines = rawIpAddressTable.split("\n");
            for (var line in lines) {
                var words = line.split(" ");
                var macAddress = words[1];
                ip = words[2];
                ipAddressTable[macAddress] = ip;
              }
            getIPFromMacAddress(macAddress, ipAddressTable, next);
          });
      }, 10000);
    }
  };

  return {
    getNewIp : getNewIp,
    removeIp : removeIp
  };

};

exports.manager = lxc_manager;
