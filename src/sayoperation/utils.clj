(ns sayoperation.utils
  (:use (clojure.contrib pprint))
  (:import (java.io BufferedWriter FileWriter)))

(defmacro as-map
  "return args as an associatave map"
  [& args]
  (reduce #(assoc %1 (keyword (name %2)) %2) {} args))

(defn save-data [data filename]
  (with-open [wtr (BufferedWriter. (java.io.FileWriter. filename))]
    (write data :stream wtr)))

(defn restore-data [filename]
  (load-string (slurp filename)))

(defn lower-case [s]
  (if (string? s) (.toLowerCase s) s))

(defmacro with-info
  "do some thing(s), print the result, and return the result"
  [prefix-message & body]
  `(let [result# ~@body]
     (println (format ~prefix-message result#))
     result#))

(defn now [] (. System currentTimeMillis))

(defn *minute* [n] (* n 60000))
