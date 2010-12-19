(defproject sayoperation "0.2.0-SNAPSHOT"
  :description "A game to collect data for experiments in machine learning of natural language semantics."
  :namespaces [sayoperation.servlet]
  :dependencies [[org.clojure/clojure "1.2.0"]
                 [org.clojure/clojure-contrib "1.2.0"]
                 [compojure "0.5.3"]
                 [ring/ring-jetty-adapter "0.2.5"]]
  :dev-dependencies [[lein-clojars "0.6.0"]
                     [swank-clojure "1.2.1"]
                     [uk.org.alienscience/leiningen-war "0.0.11"]])
