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
  
  # Add private network for Android access - use a static IP
  config.vm.network "private_network", ip: "192.168.56.10"
  
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

# Update docker-compose.yml to use the VM's IP address for Kafka
VM_IP="192.168.56.10"
sed -i "s/KAFKA_ADVERTISED_LISTENERS: PLAINTEXT:\\/\\/kafka:9092,PLAINTEXT_HOST:\\/\\/localhost:29092/KAFKA_ADVERTISED_LISTENERS: PLAINTEXT:\\/\\/kafka:9092,PLAINTEXT_HOST:\\/\\/${VM_IP}:29092/g" docker-compose.yml

# Set environment variable for Kafka producer service
echo "KAFKA_BROKERS=kafka:9092" > .env

# Start services
docker-compose up -d --build

echo "Services started! Available at:"
echo "- Agentic Service: http://${VM_IP}:3001/api-docs"
echo "- Accessibility Service: http://${VM_IP}:3002/api-docs"
echo "- Code Deploy Service: http://${VM_IP}:3003/api-docs"
echo "- Kafka Service: http://${VM_IP}:3004/api-docs"
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
    echo "Starting microservices automatically..."
    
    # Wait for Docker to be fully ready
    echo "Waiting for Docker to be ready..."
    sleep 10
    
    # Start the microservices with the VM IP
    cd /home/vagrant/recflux-demo
    
    # Update docker-compose.yml to use the VM's IP address for Kafka
    VM_IP="192.168.56.10"
    sed -i "s/KAFKA_ADVERTISED_LISTENERS: PLAINTEXT:\\/\\/kafka:9092,PLAINTEXT_HOST:\\/\\/localhost:29092/KAFKA_ADVERTISED_LISTENERS: PLAINTEXT:\\/\\/kafka:9092,PLAINTEXT_HOST:\\/\\/${VM_IP}:29092/g" docker-compose.yml
    
    # Create environment file for Kafka producer service
    echo "KAFKA_BROKERS=kafka:9092" > .env
    
    echo "Starting Docker Compose services..."
    docker-compose up -d --build
    
    # Wait a moment for services to start
    sleep 5
    
    # Check if services are running
    echo "Checking service status..."
    docker-compose ps
    
    echo ""
    echo "🎉 Microservices deployed successfully!"
    echo ""
    echo "🌐 Access your services at:"
    echo "   - Agentic Service: http://${VM_IP}:3001/api-docs"
    echo "   - Accessibility Service: http://${VM_IP}:3002/api-docs"
    echo "   - Code Deploy Service: http://${VM_IP}:3003/api-docs"
    echo "   - Kafka Service: http://${VM_IP}:3004/api-docs"
    echo ""
    echo "📋 Useful commands:"
    echo "   - View logs: docker-compose logs -f"
    echo "   - Stop services: docker-compose down"
    echo "   - SSH into VM: vagrant ssh"
  SHELL
  
  # Sync the current directory to the VM
  config.vm.synced_folder ".", "/home/vagrant/recflux-demo", 
    owner: "vagrant", 
    group: "vagrant",
    mount_options: ["dmode=755,fmode=644"]
end 