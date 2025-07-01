# -*- mode: ruby -*-
# vi: set ft=ruby :

Vagrant.configure("2") do |config|
  # Use Ubuntu 22.04 LTS as the base box
  config.vm.box = "ubuntu/jammy64"
  # Remove specific version to use the latest available
  
  # VM configuration
  config.vm.hostname = "recflux-microservices"
  
  # Network configuration
  config.vm.network "forwarded_port", guest: 3001, host: 3001  # Agentic Structured Service
  config.vm.network "forwarded_port", guest: 3002, host: 3002  # Accessibility Testing Service
  config.vm.network "forwarded_port", guest: 3003, host: 3003  # Code Deploy Service
  config.vm.network "forwarded_port", guest: 3004, host: 3004  # Kafka Producer Service
  config.vm.network "forwarded_port", guest: 9092, host: 9092  # Kafka
  config.vm.network "forwarded_port", guest: 29092, host: 29092 # Kafka External
  config.vm.network "forwarded_port", guest: 2181, host: 2181  # Zookeeper
  
  # VM resources
  config.vm.provider "virtualbox" do |vb|
    vb.memory = "4096"  # 4GB RAM
    vb.cpus = 2         # 2 CPU cores
    vb.name = "recflux-microservices"
    
    # Enable hardware virtualization
    vb.customize ["modifyvm", :id, "--hwvirtex", "on"]
    vb.customize ["modifyvm", :id, "--nestedpaging", "on"]
  end
  
  # Provisioning script
  config.vm.provision "shell", inline: <<-SHELL
    # Update system
    apt-get update
    apt-get upgrade -y
    
    # Install required packages
    apt-get install -y \
      apt-transport-https \
      ca-certificates \
      curl \
      gnupg \
      lsb-release \
      software-properties-common \
      git \
      build-essential
    
    # Install Docker
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    
    # Add vagrant user to docker group
    usermod -aG docker vagrant
    
    # Install Docker Compose (standalone version for better compatibility)
    curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    
    # Install Node.js and npm
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
    
    # Create project directory
    mkdir -p /home/vagrant/recflux-demo
    chown vagrant:vagrant /home/vagrant/recflux-demo
    
    # Set up environment
    echo 'export PATH="/usr/local/bin:$PATH"' >> /home/vagrant/.bashrc
    echo 'cd /home/vagrant/recflux-demo' >> /home/vagrant/.bashrc
    
    # Create a startup script
    cat > /home/vagrant/start-services.sh << 'EOF'
#!/bin/bash
cd /home/vagrant/recflux-demo
echo "Starting all microservices..."
docker-compose up -d
echo "Services started! Available at:"
echo "- Agentic Service: http://localhost:3001/api-docs"
echo "- Accessibility Service: http://localhost:3002/api-docs"
echo "- Code Deploy Service: http://localhost:3003/api-docs"
echo "- Kafka Service: http://localhost:3004/api-docs"
EOF
    
    chmod +x /home/vagrant/start-services.sh
    chown vagrant:vagrant /home/vagrant/start-services.sh
    
    # Create a stop script
    cat > /home/vagrant/stop-services.sh << 'EOF'
#!/bin/bash
cd /home/vagrant/recflux-demo
echo "Stopping all microservices..."
docker-compose down
echo "Services stopped!"
EOF
    
    chmod +x /home/vagrant/stop-services.sh
    chown vagrant:vagrant /home/vagrant/stop-services.sh
    
    # Create a logs script
    cat > /home/vagrant/logs.sh << 'EOF'
#!/bin/bash
cd /home/vagrant/recflux-demo
echo "Showing logs for all services..."
docker-compose logs -f
EOF
    
    chmod +x /home/vagrant/logs.sh
    chown vagrant:vagrant /home/vagrant/logs.sh
    
    echo "Vagrant VM setup complete!"
    echo "Next steps:"
    echo "1. Copy your project files to /home/vagrant/recflux-demo"
    echo "2. Run: ./start-services.sh"
  SHELL
  
  # Sync the current directory to the VM
  config.vm.synced_folder ".", "/home/vagrant/recflux-demo", 
    owner: "vagrant", 
    group: "vagrant",
    mount_options: ["dmode=755,fmode=644"]
end 