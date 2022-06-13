echo "MacOS: installing ca.pem"
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain $HOME/allproxy/ca.pem
